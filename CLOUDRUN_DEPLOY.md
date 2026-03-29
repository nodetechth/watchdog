# Cloud Run デプロイ手順

WatchDog のキャプチャ処理を Google Cloud Run にデプロイする手順です。

## 前提条件

- Google Cloud アカウント
- gcloud CLI がインストールされていること
- Firebase プロジェクトが作成済みであること

## 1. Google Cloud プロジェクトの設定

### プロジェクトの作成・選択

```bash
# 新規プロジェクトを作成する場合
gcloud projects create watchdog-capture --name="WatchDog Capture"

# 既存のプロジェクトを使用する場合
gcloud config set project YOUR_PROJECT_ID
```

### 必要な API を有効化

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## 2. gcloud CLI の認証

```bash
# ログイン
gcloud auth login

# アプリケーションのデフォルト認証を設定
gcloud auth application-default login
```

## 3. Firebase Admin SDK のサービスアカウントキー取得

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 歯車アイコン → **プロジェクトの設定**
4. **サービスアカウント** タブを選択
5. **新しい秘密鍵の生成** をクリック
6. JSON ファイルがダウンロードされます

ダウンロードした JSON から以下の値を取得:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

## 4. Cloud Run へのデプロイ

### 環境変数の設定

デプロイ前に、以下の環境変数を Cloud Run に設定する必要があります:

```bash
# 環境変数を設定してデプロイ
gcloud run deploy watchdog-capture \
  --source ./cloudrun \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars="FIREBASE_PROJECT_ID=your-project-id" \
  --set-env-vars="FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com" \
  --set-env-vars="FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  --set-env-vars="FIREBASE_STORAGE_BUCKET=your-project.appspot.com" \
  --set-env-vars="BROWSERBASE_API_KEY=your-browserbase-api-key" \
  --set-env-vars="BROWSERBASE_PROJECT_ID=your-browserbase-project-id"
```

### 注意: FIREBASE_PRIVATE_KEY の設定

`FIREBASE_PRIVATE_KEY` には改行が含まれるため、以下のいずれかの方法で設定してください:

**方法1: Base64 エンコード**
```bash
# private_key を Base64 エンコード
echo -n "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" | base64

# デプロイ時に設定
--set-env-vars="FIREBASE_PRIVATE_KEY=<Base64エンコードした値>"
```

**方法2: Cloud Console から設定**
1. [Cloud Run Console](https://console.cloud.google.com/run) にアクセス
2. `watchdog-capture` サービスを選択
3. **編集してデプロイ** をクリック
4. **変数とシークレット** タブで環境変数を追加

## 5. デプロイの確認

```bash
# サービスの状態を確認
gcloud run services describe watchdog-capture --region asia-northeast1

# サービスの URL を取得
gcloud run services describe watchdog-capture --region asia-northeast1 --format='value(status.url)'
```

## 6. Vercel の環境変数設定

Cloud Run のデプロイが完了したら、サービス URL を Vercel に設定します。

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. WatchDog プロジェクトを選択
3. **Settings** → **Environment Variables**
4. 以下の環境変数を追加:

| Key | Value |
|-----|-------|
| `CLOUD_RUN_URL` | `https://watchdog-capture-xxxxx-an.a.run.app` |
| `FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `FIREBASE_CLIENT_EMAIL` | サービスアカウントのメールアドレス |
| `FIREBASE_PRIVATE_KEY` | 秘密鍵（改行を `\n` でエスケープ） |
| `FIREBASE_STORAGE_BUCKET` | Storage バケット名 |

5. **Redeploy** をクリックして反映

## 7. Firebase Storage の CORS 設定

ブラウザから直接 PDF をダウンロードできるよう、CORS を設定します。

`cors.json` ファイルを作成:
```json
[
  {
    "origin": ["https://your-vercel-domain.vercel.app", "http://localhost:3000"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

適用:
```bash
gsutil cors set cors.json gs://your-project.appspot.com
```

## トラブルシューティング

### デプロイが失敗する場合

```bash
# ビルドログを確認
gcloud builds list --limit=5

# 詳細ログを確認
gcloud builds log BUILD_ID
```

### タイムアウトが発生する場合

Cloud Run のタイムアウトを延長:
```bash
gcloud run services update watchdog-capture \
  --region asia-northeast1 \
  --timeout 600
```

### メモリ不足の場合

```bash
gcloud run services update watchdog-capture \
  --region asia-northeast1 \
  --memory 4Gi
```

## 更新デプロイ

コードを更新した後、再デプロイ:
```bash
gcloud run deploy watchdog-capture \
  --source ./cloudrun \
  --region asia-northeast1
```
