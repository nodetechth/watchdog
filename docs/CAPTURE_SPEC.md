# WatchDog キャプチャシステム 技術仕様書

## 概要

WatchDogは、SNS投稿（主にX/Twitter）を法的証拠として保全するためのキャプチャシステムです。ツイートのスクリーンショットを取得し、PDF形式の証拠資料と証拠説明書（DOCX）を自動生成します。

## システムアーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   Browserbase    │────▶│   X (Twitter)   │
│  (Vercel Edge)  │     │  (Cloud Browser) │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Vercel Blob    │     │  Polygon Amoy    │
│  (PDF/DOCX保存) │     │  (ハッシュ記録)   │
└─────────────────┘     └──────────────────┘
```

## キャプチャ処理フロー

### 1. 認証・セッション確立

```typescript
// X認証Cookieの注入（x.comおよびtwitter.comドメイン）
await context.addCookies([
  { name: "auth_token", value: X_AUTH_TOKEN, domain: ".x.com", ... },
  { name: "ct0", value: X_CT0, domain: ".x.com", ... },
  { name: "auth_token", value: X_AUTH_TOKEN, domain: ".twitter.com", ... },
  { name: "ct0", value: X_CT0, domain: ".twitter.com", ... },
]);

// CSRFトークンをHTTPヘッダーに設定
await page.setExtraHTTPHeaders({ "x-csrf-token": X_CT0 });

// ホームページでセッション確立
await page.goto("https://x.com/home", { waitUntil: "networkidle" });
```

### 2. ツイートページへの遷移

```typescript
// URLを正規化（twitter.com → x.com）
const normalizedUrl = url.replace("twitter.com", "x.com");

// ページ遷移
await page.goto(normalizedUrl, { waitUntil: "domcontentloaded" });
await Promise.race([
  page.waitForLoadState("networkidle"),
  page.waitForTimeout(10000),  // 最大10秒待機
]);
```

### 3. ツイート要素の検出

以下のセレクタで優先順位をつけてツイート本文を検索：

1. `[data-testid="tweetText"]` - 公式のテスト用属性
2. `article div[lang]` - 言語属性を持つdiv要素
3. `[data-testid="tweet"] div[dir="auto"]` - ツイートコンテナ内のテキスト

### 4. スクリーンショット取得（重要な変更点）

**従来の方法（問題あり）:**
```typescript
// ページ全体をPDF化 → サイドバーのみがキャプチャされる問題
const pdfBuffer = await page.pdf({ format: "A4", ... });
```

**現在の実装:**
```typescript
// article要素を直接スクリーンショット
const articleElement = await page.$('article');
const articleScreenshot = await articleElement.screenshot({ type: "png" });

// Base64エンコード
const articleBase64 = articleScreenshot.toString("base64");
```

### 5. PDF生成（HTMLテンプレート方式）

article要素のスクリーンショットをHTMLテンプレートに埋め込み、新規ページでレンダリングしてPDF化：

```typescript
const evidenceHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .header { display: flex; justify-content: space-between; ... }
    .tweet-container { border: 1px solid #e1e8ed; border-radius: 12px; }
    .metadata { font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <span class="evidence-number">${evidenceNumber}</span>
    <span class="service-name">WatchDog 証拠保全</span>
  </div>
  
  <div class="url-info">
    <strong>取得URL:</strong> ${url}
  </div>
  
  <div class="tweet-container">
    <img src="data:image/png;base64,${articleBase64}" />
  </div>
  
  <div class="metadata">
    <p><strong>投稿者:</strong> ${metadata.posterId}</p>
    <p><strong>投稿日時:</strong> ${metadata.postedAt}</p>
    <p><strong>投稿内容:</strong> ${metadata.postText}</p>
  </div>
  
  <div class="footer">
    <span>取得日時: ${capturedAtDisplay}</span>
  </div>
</body>
</html>
`;

// 新規ページでHTMLをレンダリングしてPDF生成
const pdfPage = await context.newPage();
await pdfPage.setContent(evidenceHtml, { waitUntil: "load" });
const pdfBuffer = await pdfPage.pdf({
  format: "A4",
  printBackground: true,
  margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
});
```

### 6. メタデータ抽出

```typescript
const metadata = await page.evaluate(() => {
  // 複数のセレクタでフォールバック
  let postText = "";
  
  // 方法1: data-testid
  const tweetText = document.querySelector('[data-testid="tweetText"]');
  if (tweetText) postText = tweetText.textContent;
  
  // 方法2: article内のlang属性div
  if (!postText) {
    const langDiv = document.querySelector('article div[lang]');
    if (langDiv) postText = langDiv.textContent;
  }
  
  // ユーザーID（URLから取得が最も信頼性が高い）
  const urlMatch = window.location.pathname.match(/\/([^/]+)\/status\//);
  const posterId = urlMatch ? `@${urlMatch[1]}` : "";
  
  // 投稿日時
  const timeElement = document.querySelector("time");
  const postedAt = timeElement?.getAttribute("datetime");
  
  return { postText, posterId, postedAt };
});
```

### 7. 証拠説明書（DOCX）生成

`docx`ライブラリを使用して裁判所提出用の証拠説明書を自動生成：

- 号証番号
- 標目（SNS投稿キャプチャ）
- 作成者（投稿者ID）
- 作成年月日（投稿日時）
- 取得URL
- 取得日時
- SHA-256ハッシュ値
- 立証趣旨（法的請求タイプに応じたテンプレート）

### 8. ブロックチェーン記録（オプション）

Polygon Amoyテストネットにハッシュ値を記録：

```typescript
const payload = JSON.stringify({
  service: "WatchDog",
  jobId,
  sha256: hashValue.trim(),  // 改行文字を除去
  timestamp: new Date().toISOString(),
});

const tx = await wallet.sendTransaction({
  to: wallet.address,
  value: 0,
  data: ethers.hexlify(ethers.toUtf8Bytes(payload)),
});
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `BROWSERBASE_API_KEY` | Browserbase APIキー | Yes |
| `BROWSERBASE_PROJECT_ID` | BrowserbaseプロジェクトID | Yes |
| `X_AUTH_TOKEN` | X認証Cookie (auth_token) | Yes |
| `X_CT0` | X CSRFトークンCookie (ct0) | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob ストレージトークン | Yes |
| `POLYGON_PRIVATE_KEY` | Polygon ウォレット秘密鍵 | No |
| `POLYGON_RPC_URL` | Polygon RPC URL | No |

## 出力ファイル

| ファイル | 形式 | 内容 |
|----------|------|------|
| `pdfs/{jobId}.pdf` | PDF | ツイートスクリーンショット + メタデータ |
| `docx/{jobId}.docx` | DOCX | 証拠説明書（裁判所提出用） |
| `screenshots/{jobId}.png` | PNG | article要素のスクリーンショット（デバッグ用） |

## 制限事項・注意点

1. **Cookie有効期限**: X認証Cookieは定期的に更新が必要
2. **レート制限**: Browserbaseの同時セッション数に制限あり
3. **動的コンテンツ**: 画像・動画の読み込みに追加待機時間が必要
4. **セレクタ変更**: Xのセレクタは頻繁に変更されるため、フォールバック実装が重要

## 証拠検証ページ (`/verify`)

### 概要

ユーザーがスクリーンショットをアップロードすると、ブラウザ内でSHA-256を計算し、Polygon Amoyのトランザクションデータと照合して改ざんの有無を判定します。

### 設計上の制約

- **ファイルはサーバーに送信しない** - ハッシュ計算はブラウザ内（SubtleCrypto API）で完結
- **照合先はPolygon Amoy** - DBのハッシュ値はフォールバックとして使用

### フロントエンド処理

```typescript
// ブラウザ内でSHA-256を計算
async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// APIに送信するのはハッシュ値のみ（ファイルは送らない）
const res = await fetch(`/api/verify/${jobId}`, {
  method: "POST",
  body: JSON.stringify({ sha256: hash }),
});
```

### API処理 (`/api/verify/[jobId]`)

1. DBからJobIDに対応するレコードを取得
2. `txHash`が存在する場合、Polygon Amoyからトランザクションを取得
3. トランザクションの`data`フィールドからJSONペイロードをデコード
4. 記録されたハッシュ値とクライアント計算値を比較
5. `txHash`がない場合はDBの`hashValue`とのみ照合（フォールバック）

### レスポンス

```typescript
type VerifyResponse = {
  status: "MATCH" | "MISMATCH" | "NOT_FOUND";
  recordedHash: string;       // 記録されたハッシュ値
  calculatedHash: string;     // クライアント計算値
  txHash: string | null;      // PolygonトランザクションID
  polygonScanUrl: string | null;
  metadata: { jobId, posterId, postedAt, capturedAt, tweetUrl };
  source: "blockchain" | "database";
};
```

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2026-04-14 | 2.1.0 | 証拠検証ページ(`/verify`)を追加。SubtleCrypto APIによるブラウザ内ハッシュ計算、Polygon照合機能 |
| 2026-04-14 | 2.0.1 | PDFにSHA-256ハッシュ値を表示。ハッシュはスクリーンショットから計算 |
| 2026-04-14 | 2.0.0 | PDF生成方式をHTMLテンプレート方式に変更。article要素を直接スクリーンショットして埋め込み |
| 2026-04-13 | 1.1.0 | セッション確立ステップ追加、デバッグログ強化 |
| 2026-04-08 | 1.0.0 | 初期実装（page.pdf()によるフルページキャプチャ） |
