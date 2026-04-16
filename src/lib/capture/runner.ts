import { jobStore, blobStore } from "@/lib/infra";
import { LegalClaimType } from "@/types";
import { recordHashOnPolygon } from "@/lib/blockchain/polygon";
import Browserbase from "@browserbasehq/sdk";
import { chromium, Browser, Page } from "playwright-core";
import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  AlignmentType,
  convertMillimetersToTwip,
} from "docx";
import * as crypto from "crypto";

// Legal claim types and templates
const legalClaimTemplates: Record<
  LegalClaimType,
  { label: string; template: string }
> = {
  defamation: {
    label: "名誉毀損",
    template: `被告が、{postedAt}頃、SNS「X（旧Twitter）」上において、原告に関し「{postSummary}」等と投稿し、不特定多数の者が閲覧可能な状態に置いたことにより、原告の社会的評価を低下させる事実を摘示し、もって原告の名誉を毀損した事実を立証する。`,
  },
  insult: {
    label: "侮辱",
    template: `被告が、{postedAt}頃、SNS「X（旧Twitter）」上において、原告に対し「{postSummary}」等と侮蔑的表現を用いて投稿し、公然と原告を侮辱した事実を立証する。`,
  },
  privacy: {
    label: "プライバシー侵害",
    template: `被告が、{postedAt}頃、SNS「X（旧Twitter）」上において、原告の私生活上の事実である「{postSummary}」を、原告の同意なく不特定多数の者に公開し、原告のプライバシーを侵害した事実を立証する。`,
  },
  custom: {
    label: "その他（カスタム）",
    template: `本件SNS投稿の存在及びその内容を立証する。`,
  },
};

function generateClaimText(
  claimType: LegalClaimType,
  params: { postedAt?: string; postSummary?: string; customText?: string }
): string {
  if (claimType === "custom" && params.customText) {
    return params.customText;
  }
  const template = legalClaimTemplates[claimType].template;
  return template
    .replace("{postedAt}", params.postedAt || "[投稿日時]")
    .replace("{postSummary}", params.postSummary || "[投稿内容の要約]");
}

// Post metadata interface
interface PostMetadata {
  postText: string;
  posterId: string;
  postedAt: string;
}

// Extract post metadata from page
async function extractPostMetadata(page: Page): Promise<PostMetadata> {
  try {
    const metadata = await page.evaluate(() => {
      // ツイート本文の取得（複数のセレクタを試行）
      let postText = "";

      // 方法1: data-testid="tweetText"
      const tweetTextElement = document.querySelector('[data-testid="tweetText"]');
      if (tweetTextElement) {
        postText = tweetTextElement.textContent || "";
      }

      // 方法2: article内のlang属性を持つdiv
      if (!postText) {
        const article = document.querySelector('article');
        if (article) {
          const langDiv = article.querySelector('div[lang]');
          if (langDiv) {
            postText = langDiv.textContent || "";
          }
        }
      }

      // 方法3: メインツイートのテキストコンテナ
      if (!postText) {
        const mainTweet = document.querySelector('[data-testid="tweet"]');
        if (mainTweet) {
          const textContainer = mainTweet.querySelector('div[dir="auto"]');
          if (textContainer) {
            postText = textContainer.textContent || "";
          }
        }
      }

      // ユーザーIDの取得
      let posterId = "";

      // URLから取得（最も信頼性が高い）
      const urlMatch = window.location.pathname.match(/\/([^/]+)\/status\//);
      if (urlMatch) {
        posterId = `@${urlMatch[1]}`;
      }

      // フォールバック: ページ内のリンクから
      if (!posterId) {
        const userLinkElement = document.querySelector('a[href*="/status/"]');
        const href = userLinkElement?.getAttribute("href") || "";
        const posterIdMatch = href.match(/\/([^/]+)\/status\//);
        if (posterIdMatch) {
          posterId = `@${posterIdMatch[1]}`;
        }
      }

      // 投稿日時の取得
      let postedAt = "";
      const timeElement = document.querySelector("time");
      const datetime = timeElement?.getAttribute("datetime") || "";
      if (datetime) {
        const date = new Date(datetime);
        postedAt = date.toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // デバッグ情報を出力
      console.log("extractPostMetadata results:", { postText: postText.slice(0, 100), posterId, postedAt });

      return { postText, posterId, postedAt };
    });

    console.log("Metadata extracted:", {
      postTextLength: metadata.postText.length,
      postTextPreview: metadata.postText.slice(0, 100),
      posterId: metadata.posterId,
      postedAt: metadata.postedAt,
    });

    return metadata;
  } catch (error) {
    console.warn("メタデータ抽出エラー:", error);
    return { postText: "", posterId: "", postedAt: "" };
  }
}

// Generate evidence document (DOCX)
async function generateEvidenceDocx(data: {
  evidenceNumber: string;
  url: string;
  hash: string;
  capturedAt: string;
  claimType: LegalClaimType;
  customClaimText?: string;
  metadata: PostMetadata;
}): Promise<Buffer> {
  const claimText =
    data.claimType === "custom" && data.customClaimText
      ? data.customClaimText
      : generateClaimText(data.claimType, {
          postedAt: data.metadata.postedAt || "[投稿日時]",
          postSummary: data.metadata.postText
            ? data.metadata.postText.slice(0, 50) +
              (data.metadata.postText.length > 50 ? "..." : "")
            : "[投稿内容]",
        });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "MS Mincho",
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "証 拠 説 明 書（案）", bold: true, size: 32 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "※本書面はAIが自動生成したサンプルです。最終的な内容は弁護士等の専門家にご確認の上、ご自身の責任でご利用ください。",
                italics: true,
                size: 18,
                color: "666666",
              }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "１．号証番号", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `　　${data.evidenceNumber}` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "２．標目", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "　　SNS投稿キャプチャ（X / 旧Twitter）" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "３．作成者", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `　　${data.metadata.posterId || "（相手方）"}`,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "４．作成年月日", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `　　${data.metadata.postedAt || "（投稿日時参照）"}`,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "５．取得URL", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `　　${data.url}`, size: 20 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "６．取得日時", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `　　${data.capturedAt}` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "７．取得者", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "　　WatchDog証拠保全システム（自動取得）" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "８．ハッシュ値（SHA-256）", bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `　　${data.hash}`,
                size: 18,
                font: "Courier New",
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "９．立証趣旨", bold: true })],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: claimText })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "【証拠の真正性について】", bold: true }),
            ],
            spacing: { before: 600, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "本証拠PDFは、上記SHA-256ハッシュ値により取得時点からの非改ざん性を検証可能です。",
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "※将来的に認定タイムスタンプ（RFC3161準拠）を付与予定です。",
                size: 18,
                italics: true,
                color: "666666",
              }),
            ],
            spacing: { before: 100 },
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * キャプチャ処理のエントリーポイント
 * Vercelの waitUntil() から呼ばれる
 */
export async function runCapture(
  jobId: string,
  url: string,
  evidenceNumber: string,
  evidenceType: LegalClaimType,
  customClaimText?: string | null
): Promise<void> {
  let browser: Browser | null = null;

  try {
    // 1. ステータスを processing に更新
    await jobStore.updateJob(jobId, { status: "processing" });

    // Browserbase setup
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!browserbaseApiKey || !browserbaseProjectId) {
      throw new Error("Browserbaseの設定が必要です");
    }

    // Create Browserbase session
    const bb = new Browserbase({ apiKey: browserbaseApiKey });
    const session = await bb.sessions.create({
      projectId: browserbaseProjectId,
    });

    // Connect with Playwright
    browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0];
    const page: Page = context.pages()[0];

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // Inject X (Twitter) cookies for authentication
    const xAuthToken = process.env.X_AUTH_TOKEN;
    const xCt0 = process.env.X_CT0;

    if (xAuthToken && xCt0) {
      // twitter.comドメインにも追加（リダイレクト対応）
      await context.addCookies([
        {
          name: "auth_token",
          value: xAuthToken,
          domain: ".x.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "None",
        },
        {
          name: "ct0",
          value: xCt0,
          domain: ".x.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: "auth_token",
          value: xAuthToken,
          domain: ".twitter.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "None",
        },
        {
          name: "ct0",
          value: xCt0,
          domain: ".twitter.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "Lax",
        },
      ]);
      console.log("X cookies injected for both x.com and twitter.com domains");

      // CSRFトークンをヘッダーに設定
      await page.setExtraHTTPHeaders({
        "x-csrf-token": xCt0,
      });

      // First visit X homepage to establish session
      console.log("Establishing X session...");
      await page.goto("https://x.com/home", { waitUntil: "networkidle", timeout: 40000 });
      await page.waitForTimeout(3000);

      // セッション確立の確認
      const homeUrl = page.url();
      console.log("After home visit, URL:", homeUrl);

      // ログイン状態の確認（プロフィールアイコンの存在チェック）
      const isLoggedIn = await page.evaluate(() => {
        const accountSwitcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
        const profileLink = document.querySelector('a[href*="/compose/tweet"]');
        return !!accountSwitcher || !!profileLink;
      });
      console.log("Login status check - isLoggedIn:", isLoggedIn);

      if (!isLoggedIn) {
        // 追加のログイン確認
        const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
        console.log("Body text preview:", bodyText);
      }
    } else {
      console.warn("X cookies not configured - tweets may require login");
    }

    // Navigate to target tweet URL
    console.log("Navigating to tweet URL:", url);

    // twitter.com URLをx.comに変換
    const normalizedUrl = url.replace("twitter.com", "x.com");
    console.log("Normalized URL:", normalizedUrl);

    await page.goto(normalizedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // networkidleを待つ（ただし長すぎる場合はタイムアウト）
    await Promise.race([
      page.waitForLoadState("networkidle"),
      page.waitForTimeout(10000),
    ]);

    // 追加の待機時間（動的コンテンツ読み込み用）
    await page.waitForTimeout(3000);

    // ツイート本文の出現を待機（最大15秒）
    console.log("Waiting for tweet content...");
    console.log("Current page URL:", page.url());
    console.log("Page title:", await page.title());

    // ページのHTMLを一部出力してデバッグ
    const htmlPreview = await page.evaluate(() => {
      return document.documentElement.outerHTML.slice(0, 2000);
    });
    console.log("HTML preview (first 2000 chars):", htmlPreview);

    let tweetLoaded = await page
      .waitForSelector('[data-testid="tweetText"]', { timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (!tweetLoaded) {
      console.log("tweetText not found, checking page state...");

      // ページのURLを確認
      const currentUrl = page.url();
      console.log("Current URL:", currentUrl);

      // Check for login/signup prompts
      const pageContent = await page.content();
      const hasLoginPrompt = pageContent.includes("New to X?") ||
                             pageContent.includes("Sign up") ||
                             pageContent.includes("Log in");
      console.log("Has login prompt:", hasLoginPrompt);

      // Check what's in the main content area
      const mainContentCheck = await page.evaluate(() => {
        const main = document.querySelector('main');
        const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
        return {
          hasMain: !!main,
          mainText: main?.textContent?.slice(0, 500) || '',
          hasPrimaryColumn: !!primaryColumn,
          primaryColumnText: primaryColumn?.textContent?.slice(0, 500) || ''
        };
      });
      console.log("Main content check:", JSON.stringify(mainContentCheck));

      if (hasLoginPrompt && !mainContentCheck.hasPrimaryColumn) {
        throw new Error(
          "X のログインが必要です。サービスアカウントの Cookie が期限切れの可能性があります。管理者にお問い合わせください。"
        );
      }

      // Try scrolling down to trigger lazy loading
      console.log("Attempting scroll to trigger lazy loading...");
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(2000);

      // 記事要素を探す
      const articleFound = await page
        .waitForSelector("article", { timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (articleFound) {
        console.log("Article found, checking for tweet content...");

        // Scroll to the article
        await page.evaluate(() => {
          const article = document.querySelector('article');
          article?.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await page.waitForTimeout(1500);

        // Try alternative selectors
        const tweetContent = await page.evaluate(() => {
          const article = document.querySelector('article');
          if (!article) return null;

          // Try different selectors for tweet text
          const tweetText = article.querySelector('[data-testid="tweetText"]');
          const spanText = article.querySelector('div[lang] span');

          return {
            hasTweetText: !!tweetText,
            tweetTextContent: tweetText?.textContent?.slice(0, 200) || '',
            hasSpanText: !!spanText,
            spanTextContent: spanText?.textContent?.slice(0, 200) || '',
            articleHtml: article.innerHTML.slice(0, 1000)
          };
        });
        console.log("Tweet content search:", JSON.stringify(tweetContent));

        tweetLoaded = await page
          .waitForSelector('[data-testid="tweetText"]', { timeout: 5000 })
          .then(() => true)
          .catch(() => false);
      }

      if (!articleFound && !tweetLoaded) {
        console.log("Tweet not found. Page title:", await page.title());
        throw new Error(
          "ツイートが見つかりませんでした。URL が正しいか、ツイートが削除されていないか確認してください。"
        );
      }
    } else {
      console.log("Tweet content found successfully");
    }

    // 画像・アバターの読み込み待機（追加1秒）
    await page.waitForTimeout(1000);

    // メインツイートのarticle要素を特定
    const articleElement = await page.$('article');
    if (!articleElement) {
      throw new Error("ツイートのarticle要素が見つかりませんでした");
    }

    // article要素のスクリーンショットを取得
    console.log("Capturing article element screenshot...");
    const articleScreenshot = await articleElement.screenshot({ type: "png" });
    console.log("Article screenshot captured, size:", articleScreenshot.length, "bytes");

    // スクリーンショットをBase64に変換
    const articleBase64 = articleScreenshot.toString("base64");

    // スクリーンショットのSHA-256ハッシュを計算（PDF生成前に計算してPDFに含める）
    const screenshotHash = crypto
      .createHash("sha256")
      .update(articleScreenshot)
      .digest("hex");
    console.log("Screenshot hash calculated:", screenshotHash);

    // Extract metadata
    const metadata = await extractPostMetadata(page);

    // Evidence number fallback
    const displayEvidenceNumber = evidenceNumber?.trim() || "甲第1号証";

    // Capture timestamp
    const capturedAt = new Date().toISOString();
    const capturedAtDisplay = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // HTMLテンプレートを作成してスクリーンショットを埋め込む
    const evidenceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'MS Gothic', sans-serif;
      padding: 20px;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 2px solid #1da1f2;
      margin-bottom: 20px;
    }
    .header .evidence-number {
      font-weight: bold;
      font-size: 14px;
    }
    .header .service-name {
      color: #666;
      font-size: 12px;
    }
    .url-info {
      background: #f7f9fa;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
      font-size: 11px;
      word-break: break-all;
    }
    .url-info strong {
      color: #333;
    }
    .tweet-container {
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .tweet-container img {
      width: 100%;
      height: auto;
      display: block;
    }
    .metadata {
      font-size: 11px;
      color: #666;
      padding: 10px;
      background: #f7f9fa;
      border-radius: 4px;
    }
    .metadata p {
      margin: 5px 0;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e1e8ed;
      font-size: 10px;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    .hash-info {
      margin-top: 10px;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 9px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
      color: #333;
    }
    .verify-info {
      margin-top: 15px;
      padding: 10px;
      background: #e8f4fd;
      border: 1px solid #b8daff;
      border-radius: 4px;
      font-size: 9px;
      color: #004085;
    }
    .verify-info strong {
      display: block;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="evidence-number">${displayEvidenceNumber}</span>
    <span class="service-name">WatchDog 証拠保全</span>
  </div>

  <div class="url-info">
    <strong>取得URL:</strong> ${url}
  </div>

  <div class="tweet-container">
    <img src="data:image/png;base64,${articleBase64}" alt="Tweet Screenshot" />
  </div>

  <div class="metadata">
    <p><strong>投稿者:</strong> ${metadata.posterId || "不明"}</p>
    <p><strong>投稿日時:</strong> ${metadata.postedAt || "不明"}</p>
    <p><strong>投稿内容:</strong> ${metadata.postText ? metadata.postText.slice(0, 200) + (metadata.postText.length > 200 ? "..." : "") : "取得できませんでした"}</p>
  </div>

  <div class="footer">
    <span>取得日時: ${capturedAtDisplay}</span>
    <span>WatchDog Evidence Preservation System</span>
  </div>

  <div class="hash-info">
    <strong>SHA-256:</strong> ${screenshotHash}
  </div>

  <div class="verify-info">
    <strong>【改ざん検証方法】</strong>
    証拠の所有者から検証用リンクを受け取り、WatchDogの検証ページ（/verify）でPNGファイルをアップロードしてください。
    ハッシュ値がPolygon Amoyブロックチェーンの記録と一致すれば、改ざんがないことが証明されます。
  </div>
</body>
</html>
`;

    // 新しいページでHTMLをレンダリングしてPDF生成
    const pdfPage = await context.newPage();
    await pdfPage.setContent(evidenceHtml, { waitUntil: "load" });

    const pdfBuffer = await pdfPage.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
    });

    await pdfPage.close();
    console.log("PDF generated from HTML template, size:", pdfBuffer.length, "bytes");

    // デバッグ用にarticleスクリーンショットを保存
    const screenshotBuffer = articleScreenshot;

    // ハッシュ値はスクリーンショットから計算済み（PDFに含めるため）
    const hashValue = screenshotHash;

    // Generate evidence document (DOCX)
    const docxBuffer = await generateEvidenceDocx({
      evidenceNumber: displayEvidenceNumber,
      url,
      hash: hashValue,
      capturedAt: capturedAtDisplay,
      claimType: evidenceType,
      customClaimText: customClaimText || undefined,
      metadata,
    });

    // 3. PDF・DOCX・スクリーンショットを並列保存
    const [pdfKey, docxKey, screenshotKey] = await Promise.all([
      blobStore.save(`pdfs/${jobId}.pdf`, pdfBuffer, "application/pdf"),
      blobStore.save(
        `docx/${jobId}.docx`,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ),
      blobStore.save(`screenshots/${jobId}.png`, screenshotBuffer, "image/png"),
    ]);
    console.log("Screenshot saved for debugging:", screenshotKey);

    // 4. Polygonブロックチェーンにハッシュを記録
    let txHash: string | undefined;
    let explorerUrl: string | undefined;

    try {
      const polygonResult = await recordHashOnPolygon(jobId, hashValue);
      if (polygonResult) {
        txHash = polygonResult.txHash;
        explorerUrl = polygonResult.explorerUrl;
      }
    } catch (error) {
      console.warn("Polygon recording failed:", error);
      // Continue even if Polygon recording fails
    }

    // 5. ジョブを完了状態に更新（Polygon結果も含める）
    await jobStore.updateJob(jobId, {
      status: "done",
      pdfKey,
      docxKey,
      hashValue,
      capturedAt,
      txHash,
      explorerUrl,
    });

    console.log(`Job ${jobId} completed successfully`);
  } catch (error: unknown) {
    console.error(`Job ${jobId} failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "キャプチャに失敗しました";

    await jobStore.updateJob(jobId, {
      status: "error",
      errorMessage,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
