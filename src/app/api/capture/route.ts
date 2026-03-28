import { NextResponse } from "next/server";
import Browserbase from "@browserbasehq/sdk";
import { chromium, Browser, Page } from "playwright-core";
import { Document, Paragraph, TextRun, Packer, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, convertMillimetersToTwip } from "docx";
import * as crypto from "crypto";
import { LegalClaimType } from "@/types";
import { generateClaimText } from "@/lib/templates/legal-templates";

// X投稿からメタデータを抽出
interface PostMetadata {
  postText: string;
  posterId: string;
  postedAt: string;
}

export async function POST(req: Request) {
  let browser: Browser | null = null;

  try {
    const body = await req.json();
    const { url, claimType = "defamation", customClaimText, evidenceNumber = "甲第1号証" } = body;

    if (!url || !url.includes("x.com/")) {
      return NextResponse.json(
        { error: "有効なX（旧Twitter）のURLを入力してください。" },
        { status: 400 }
      );
    }

    // Browserbaseの設定確認
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!browserbaseApiKey || !browserbaseProjectId) {
      return NextResponse.json(
        { error: "Browserbaseの設定が必要です。環境変数を確認してください。" },
        { status: 500 }
      );
    }

    // Browserbaseでセッション作成
    const bb = new Browserbase({ apiKey: browserbaseApiKey });
    const session = await bb.sessions.create({
      projectId: browserbaseProjectId,
    });

    // PlaywrightでBrowserbaseに接続
    browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0];
    const page: Page = context.pages()[0];

    // ビューポート設定
    await page.setViewportSize({ width: 1280, height: 2000 });

    // URLへ移動
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 投稿が読み込まれるまで待機
    await page.waitForTimeout(5000);

    // スレッドがある場合は展開
    try {
      const showRepliesButton = await page.$('div[role="button"]:has-text("Show"), div[role="button"]:has-text("返信を表示")');
      if (showRepliesButton) {
        await showRepliesButton.click();
        await page.waitForTimeout(3000);
      }
    } catch {
      // ボタンが見つからない場合は無視
    }

    // 自動スクロール
    await autoScroll(page);

    // メタデータを抽出
    const metadata = await extractPostMetadata(page);

    // フルページPDFとしてキャプチャ
    const pdfBuffer = await page.pdf({
      format: "A3",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    // SHA-256ハッシュを計算
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    // 取得日時
    const capturedAt = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // 証拠説明書を生成
    const docxBuffer = await generateEvidenceDocx({
      evidenceNumber,
      url,
      hash,
      capturedAt,
      claimType: claimType as LegalClaimType,
      customClaimText,
      metadata,
    });

    // Base64エンコードしてレスポンス
    const pdfBase64 = pdfBuffer.toString("base64");
    const docxBase64 = docxBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      hash,
      pdfBase64,
      docxBase64,
      capturedAt,
      postText: metadata.postText,
      posterId: metadata.posterId,
      postedAt: metadata.postedAt,
    });
  } catch (error: unknown) {
    console.error("Capture Error:", error);
    const errorMessage = error instanceof Error ? error.message : "キャプチャに失敗しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 自動スクロール関数
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const maxScrolls = 10;
      let scrollCount = 0;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 300);
    });
  });

  await page.waitForTimeout(1000);
}

// 投稿メタデータを抽出
async function extractPostMetadata(page: Page): Promise<PostMetadata> {
  try {
    const metadata = await page.evaluate(() => {
      const tweetTextElement = document.querySelector('[data-testid="tweetText"]');
      const postText = tweetTextElement?.textContent || "";

      const userLinkElement = document.querySelector('a[href*="/status/"]');
      const href = userLinkElement?.getAttribute("href") || "";
      const posterIdMatch = href.match(/\/([^/]+)\/status\//);
      const posterId = posterIdMatch ? `@${posterIdMatch[1]}` : "";

      const timeElement = document.querySelector("time");
      const datetime = timeElement?.getAttribute("datetime") || "";
      let postedAt = "";
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

      return { postText, posterId, postedAt };
    });

    return metadata;
  } catch (error) {
    console.warn("メタデータ抽出エラー:", error);
    return { postText: "", posterId: "", postedAt: "" };
  }
}

// 証拠説明書を生成
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
            ? data.metadata.postText.slice(0, 50) + (data.metadata.postText.length > 50 ? "..." : "")
            : "[投稿内容]",
        });

  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "000000",
  };

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
              new TextRun({
                text: "証 拠 説 明 書（案）",
                bold: true,
                size: 32,
              }),
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
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: "号証", bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: "標目", bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: "作成年月日", bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: "作成者", bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: data.evidenceNumber })] })],
                  }),
                  new TableCell({
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: "SNS投稿キャプチャ" })] })],
                  }),
                  new TableCell({
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: data.metadata.postedAt || "（投稿日時参照）" })] })],
                  }),
                  new TableCell({
                    borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
                    children: [new Paragraph({ children: [new TextRun({ text: data.metadata.posterId || "（相手方）" })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: `取得URL：${data.url}`, size: 20 })],
            spacing: { before: 400, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `取得日時：${data.capturedAt}`, size: 20 })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `SHA-256：${data.hash}`, size: 16, font: "Courier New" })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "【立証趣旨】", bold: true })],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: claimText })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "【証拠の真正性について】", bold: true })],
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
