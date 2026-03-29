# AWS Lambda デプロイ手順

WatchDog のキャプチャ処理を AWS Lambda（コンテナイメージ形式）にデプロイする手順です。

## アーキテクチャ

```
Vercel (Next.js)
    ↓ POST /api/jobs
API Route → DynamoDB (ジョブ作成) → SQS (メッセージ送信)
    ↓ トリガー
Lambda (コンテナイメージ: Stagehand + PDF生成)
    ↓ 完了後
S3 (PDF保存) + DynamoDB (ステータス更新)
    ↓ ポーリング
Vercel → DynamoDB (ステータス確認) → S3 Presigned URL
```

## 前提条件

- AWS アカウント
- AWS CLI がインストール・設定済み
- Docker がインストール済み

## 1. AWS CLI の設定

```bash
aws configure
# AWS Access Key ID: (IAMユーザーのアクセスキー)
# AWS Secret Access Key: (IAMユーザーのシークレットキー)
# Default region name: ap-northeast-1
# Default output format: json
```

## 2. IAM ロールの作成

Lambda 実行用の IAM ロールを作成します。

### 2-1. 信頼ポリシー (trust-policy.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 2-2. ロールの作成

```bash
aws iam create-role \
  --role-name watchdog-lambda-role \
  --assume-role-policy-document file://trust-policy.json
```

### 2-3. 必要なポリシーをアタッチ

```bash
# 基本実行権限
aws iam attach-role-policy \
  --role-name watchdog-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# DynamoDB アクセス
aws iam attach-role-policy \
  --role-name watchdog-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

# S3 アクセス
aws iam attach-role-policy \
  --role-name watchdog-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# SQS アクセス
aws iam attach-role-policy \
  --role-name watchdog-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess

# ECR アクセス
aws iam attach-role-policy \
  --role-name watchdog-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
```

## 3. DynamoDB テーブルの作成

```bash
aws dynamodb create-table \
  --table-name watchdog-jobs \
  --attribute-definitions AttributeName=jobId,AttributeType=S \
  --key-schema AttributeName=jobId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

## 4. S3 バケットの作成

```bash
aws s3 mb s3://watchdog-evidence-pdfs --region ap-northeast-1

# CORS 設定（ブラウザからのダウンロード用）
aws s3api put-bucket-cors \
  --bucket watchdog-evidence-pdfs \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'
```

## 5. SQS キューの作成

```bash
aws sqs create-queue \
  --queue-name watchdog-capture-queue \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "86400"
  }' \
  --region ap-northeast-1
```

キューの URL を取得:
```bash
aws sqs get-queue-url --queue-name watchdog-capture-queue --region ap-northeast-1
```

## 6. ECR リポジトリの作成

```bash
aws ecr create-repository \
  --repository-name watchdog-capture \
  --region ap-northeast-1
```

## 7. Lambda コンテナイメージのビルド・デプロイ

### 7-1. ECR にログイン

```bash
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS \
  --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com
```

`YOUR_ACCOUNT_ID` は AWS アカウント ID に置き換えてください。

### 7-2. イメージをビルド・プッシュ

```bash
cd lambda

# ビルド
docker build --platform linux/amd64 -t watchdog-capture .

# タグ付け
docker tag watchdog-capture:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/watchdog-capture:latest

# プッシュ
docker push \
  YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/watchdog-capture:latest
```

### 7-3. Lambda 関数の作成

```bash
aws lambda create-function \
  --function-name watchdog-capture \
  --package-type Image \
  --code ImageUri=YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/watchdog-capture:latest \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/watchdog-lambda-role \
  --timeout 300 \
  --memory-size 2048 \
  --region ap-northeast-1
```

### 7-4. Lambda 環境変数の設定

```bash
aws lambda update-function-configuration \
  --function-name watchdog-capture \
  --environment "Variables={
    S3_BUCKET_NAME=watchdog-evidence-pdfs,
    DYNAMODB_TABLE_NAME=watchdog-jobs,
    BROWSERBASE_API_KEY=your-browserbase-api-key,
    BROWSERBASE_PROJECT_ID=your-browserbase-project-id
  }" \
  --region ap-northeast-1
```

### 7-5. SQS トリガーの設定

```bash
aws lambda create-event-source-mapping \
  --function-name watchdog-capture \
  --event-source-arn arn:aws:sqs:ap-northeast-1:YOUR_ACCOUNT_ID:watchdog-capture-queue \
  --batch-size 1 \
  --region ap-northeast-1
```

## 8. Vercel 環境変数の設定

Vercel ダッシュボードで以下の環境変数を設定してください:

| Key | Value |
|-----|-------|
| `AWS_REGION` | `ap-northeast-1` |
| `AWS_ACCESS_KEY_ID` | IAM ユーザーのアクセスキー |
| `AWS_SECRET_ACCESS_KEY` | IAM ユーザーのシークレットアクセスキー |
| `SQS_QUEUE_URL` | SQS キューの URL |
| `DYNAMODB_TABLE_NAME` | `watchdog-jobs` |
| `S3_BUCKET_NAME` | `watchdog-evidence-pdfs` |

## Lambda の更新デプロイ

コードを更新した場合:

```bash
# 再ビルド・プッシュ
docker build --platform linux/amd64 -t watchdog-capture ./lambda
docker tag watchdog-capture:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/watchdog-capture:latest
docker push \
  YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/watchdog-capture:latest

# Lambda を最新イメージに更新
aws lambda update-function-code \
  --function-name watchdog-capture \
  --image-uri YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/watchdog-capture:latest \
  --region ap-northeast-1
```

## トラブルシューティング

### Lambda ログの確認

```bash
aws logs tail /aws/lambda/watchdog-capture --follow --region ap-northeast-1
```

### SQS デッドレターキューの確認

処理に失敗したメッセージがある場合、デッドレターキューを設定することを推奨します。

### タイムアウトが発生する場合

Lambda のタイムアウトを延長:
```bash
aws lambda update-function-configuration \
  --function-name watchdog-capture \
  --timeout 600 \
  --region ap-northeast-1
```
