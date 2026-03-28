import { NextResponse } from "next/server";
import { chromium, Browser, Page } from "playwright";
import { Document, Paragraph, TextRun, Packer, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, convertMillimetersToTwip } from "docx";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { LegalClaimType } from "@/types";
import { generateClaimText } from "@/lib/templates/legal-templates";

// RFC3161タイムスタンプ付与（将来実装用スタブ）
async function applyTimestampAndSignature(pdfBuffer: Buffer): Promise<Buffer> {
  // TODO: セイコーソリューションズ「かんたん電子契約」API対応
  // const API_KEY = process.env.SEIKO_API_KEY;
  // const res = await fetch("https://api.seiko-solutions.example/timestamp", {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${API_KEY}` },
  //   body: pdfBuffer
  // });
  // return Buffer.from(await res.arrayBuffer());

  return pdfBuffer;
}

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

    // Playwrightでブラウザを起動
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 2000 },
      locale: "ja-JP",
    });
    const page: Page = await context.newPage();

    // URLへ移動
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 投稿が読み込まれるまで待機
    await page.waitForTimeout(5000);

    // スレッドがある場合は展開（返信を表示ボタンをクリック）
    try {
      const showRepliesButton = await page.$('div[role="button"]:has-text("Show"), div[role="button"]:has-text("返信を表示")');
      if (showRepliesButton) {
        await showRepliesButton.click();
        await page.waitForTimeout(3000);
      }
    } catch {
      // ボタンが見つからない場合は無視
    }

    // スレッドが長い場合は自動スクロール
    await autoScroll(page);

    // 投稿のメタデータを抽出
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

    // タイムスタンプを付与（将来実装）
    const stampedPdfBuffer = await applyTimestampAndSignature(pdfBuffer);

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

    // ファイルを保存
    const publicDir = path.join(process.cwd(), "public", "downloads");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const timestampId = Date.now().toString();
    const pdfFilename = `evidence_${timestampId}.pdf`;
    const docxFilename = `evidence_description_${timestampId}.docx`;

    fs.writeFileSync(path.join(publicDir, pdfFilename), stampedPdfBuffer);
    fs.writeFileSync(path.join(publicDir, docxFilename), docxBuffer);

    // TODO: Firestoreに保存（Firebase設定後に有効化）
    // await saveEvidenceRecord({
    //   url,
    //   hash,
    //   capturedAt,
    //   pdfStoragePath: `evidence/${pdfFilename}`,
    //   docxStoragePath: `documents/${docxFilename}`,
    //   metadata,
    // });

    return NextResponse.json({
      success: true,
      hash,
      pdfUrl: `/downloads/${pdfFilename}`,
      docxUrl: `/downloads/${docxFilename}`,
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
      const maxScrolls = 10; // 最大スクロール回数
      let scrollCount = 0;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          window.scrollTo(0, 0); // 先頭に戻る
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
      // 投稿テキストを抽出
      const tweetTextElement = document.querySelector('[data-testid="tweetText"]');
      const postText = tweetTextElement?.textContent || "";

      // 投稿者IDを抽出
      const userLinkElement = document.querySelector('a[href*="/status/"]');
      const href = userLinkElement?.getAttribute("href") || "";
      const posterIdMatch = href.match(/\/([^/]+)\/status\//);
      const posterId = posterIdMatch ? `@${posterIdMatch[1]}` : "";

      // 投稿日時を抽出（time要素のdatetime属性から）
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
  // 立証趣旨テキストを生成
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
          // タイトル
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

          // 注意書き
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

          // 証拠一覧表
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

          // 取得情報
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

          // 立証趣旨
          new Paragraph({
            children: [new TextRun({ text: "【立証趣旨】", bold: true })],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: claimText })],
            spacing: { after: 400 },
          }),

          // 真正性担保
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
