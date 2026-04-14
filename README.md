# WatchDog - SNS証拠保全システム

SNS投稿（X/Twitter）を法的証拠として保全するためのWebアプリケーションです。ツイートのスクリーンショットを取得し、裁判所提出用のPDF証拠資料と証拠説明書（DOCX）を自動生成します。

## 主な機能

- **ツイートキャプチャ**: URLを入力するだけでツイートを自動取得
- **証拠PDF生成**: ツイートのスクリーンショット + メタデータをPDF化
- **証拠説明書生成**: 裁判所提出用のDOCX形式証拠説明書を自動作成
- **ハッシュ値記録**: SHA-256ハッシュによる改ざん検知
- **ブロックチェーン記録**: Polygon Amoyテストネットへのハッシュ記録（オプション）

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React, Tailwind CSS
- **バックエンド**: Vercel Serverless Functions
- **ブラウザ自動化**: Browserbase + Playwright
- **ストレージ**: Vercel Blob Storage
- **認証**: NextAuth.js (Google OAuth)
- **決済**: Stripe
- **ブロックチェーン**: Polygon Amoy (ethers.js v6)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env.local`を作成し、必要な値を設定：

```bash
cp .env.example .env.local
```

必須の環境変数:
- `BROWSERBASE_API_KEY` / `BROWSERBASE_PROJECT_ID`
- `X_AUTH_TOKEN` / `X_CT0` (X認証Cookie)
- `BLOB_READ_WRITE_TOKEN`

### 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## X認証Cookieの取得方法

1. ブラウザでX (twitter.com) にログイン
2. DevTools を開く (F12)
3. Application > Cookies > x.com を選択
4. `auth_token` と `ct0` の値をコピー
5. 環境変数 `X_AUTH_TOKEN` と `X_CT0` に設定

**注意**: これらのCookieは定期的に期限切れになるため、更新が必要です。

## ドキュメント

- [キャプチャシステム技術仕様書](./docs/CAPTURE_SPEC.md)
- [AWSデプロイガイド](./AWS_DEPLOY.md)

## デプロイ

### Vercel (推奨)

```bash
vercel --prod
```

### 環境変数の設定

Vercelダッシュボードまたは以下のコマンドで設定：

```bash
vercel env add X_AUTH_TOKEN
vercel env add X_CT0
# ... 他の環境変数
```

## ライセンス

Private - All rights reserved
