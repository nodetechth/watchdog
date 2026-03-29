# Cloud Run デプロイ手順

WatchDog のキャプチャ処理を Google Cloud Run にデプロイする手順です。

## 前提条件

- Google Cloud アカウント
- gcloud CLI がインストールされていること
- Firebase プロジェクトが作成済みであること

## 1. gcloud CLI のインストール

```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk

# インストール後、シェルを再起動
source ~/.zshrc
```

## 2. gcloud CLI の認証

```bash
# ログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project YOUR_FIREBASE_PROJECT_ID
```

## 3. 必要な API を有効化

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable firestore.googleapis.com
```

## 4. Cloud Run サービスアカウントに権限を付与

Cloud Run はデフォルトのサービスアカウントを使用します。
Firebase / Firestore へのアクセス権限を付与してください。

```bash
# プロジェクト番号を取得
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

# Cloud Run サービスアカウントに Firestore アクセス権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"

# Firebase Storage アクセス権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

## 5. Cloud Run へのデプロイ

```bash
gcloud run deploy watchdog-capture \
  --source ./cloudrun \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars="FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com" \
  --set-env-vars="BROWSERBASE_API_KEY=your-browserbase-api-key" \
  --set-env-vars="BROWSERBASE_PROJECT_ID=your-browserbase-project-id"
```

**認証について:**
Cloud Run は Application Default Credentials (ADC) を使用します。
サービスアカウントキーは不要です。Cloud Run に割り当てられたサービスアカウントが自動的に使用されます。

## 6. デプロイの確認

```bash
# サービスの状態を確認
gcloud run services describe watchdog-capture --region asia-northeast1

# サービスの URL を取得
gcloud run services describe watchdog-capture --region asia-northeast1 --format='value(status.url)'
```

## 7. Vercel の環境変数設定

Cloud Run のデプロイが完了したら、サービス URL を Vercel に設定します。

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. WatchDog プロジェクトを選択
3. **Settings** → **Environment Variables**
4. 以下の環境変数を追加:

| Key | Value |
|-----|-------|
| `CLOUD_RUN_URL` | `https://watchdog-capture-xxxxx-an.a.run.app` |
| `FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `FIREBASE_STORAGE_BUCKET` | Storage バケット名（例: `your-project.appspot.com`） |

**注意:** Vercel は Cloud Run を経由して Firestore にアクセスするため、
サービスアカウントキーは不要です。

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
