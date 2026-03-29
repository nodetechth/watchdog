import express, { Request, Response } from "express";
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
import * as admin from "firebase-admin";

/**
 * Firebase Admin SDK initialization using Application Default Credentials (ADC)
 *
 * On Cloud Run, ADC automatically uses the service account assigned to the Cloud Run service.
 * No service account key file is needed.
 *
 * Required environment variables:
 * - FIREBASE_STORAGE_BUCKET: Firebase Storage bucket name (e.g., "your-project.appspot.com")
 *
 * Cloud Run service account needs the following IAM roles:
 * - roles/datastore.user (for Firestore)
 * - roles/storage.objectAdmin (for Firebase Storage)
 */
const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Legal claim types and templates
type LegalClaimType = "defamation" | "insult" | "privacy" | "custom";

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
      const tweetTextElement = document.querySelector(
        '[data-testid="tweetText"]'
      );
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
              new TextRun({
                text: "　　SNS投稿キャプチャ（X / 旧Twitter）",
              }),
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
            children: [
              new TextRun({ text: "７．ハッシュ値（SHA-256）", bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `　　${data.hash}`, size: 18, font: "Courier New" }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "８．立証趣旨", bold: true })],
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

// Main capture function
async function capturePost(
  jobId: string,
  url: string,
  evidenceNumber: string,
  evidenceType: LegalClaimType,
  customClaimText?: string
): Promise<void> {
  let browser: Browser | null = null;

  try {
    // Update status to processing
    await db.collection("jobs").doc(jobId).update({
      status: "processing",
    });

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

    // Navigate to URL
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for post to load
    await page.waitForTimeout(3000);

    // Extract metadata
    const metadata = await extractPostMetadata(page);

    // Evidence number fallback
    const displayEvidenceNumber = evidenceNumber?.trim() || "甲第1号証";

    // Capture timestamp
    const capturedAt = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Generate PDF with header
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; font-size: 10px; padding: 5px 20px; display: flex; justify-content: space-between; align-items: center; font-family: 'MS Gothic', 'Hiragino Kaku Gothic ProN', sans-serif;">
          <span style="font-weight: bold;">${displayEvidenceNumber}</span>
          <span style="color: #666;">WatchDog 証拠保全</span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 5px 20px; display: flex; justify-content: space-between; align-items: center; font-family: 'MS Gothic', 'Hiragino Kaku Gothic ProN', sans-serif; color: #666;">
          <span>取得日時: ${capturedAt}</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "25mm",
        right: "10mm",
        bottom: "20mm",
        left: "10mm",
      },
    });

    // Calculate SHA-256 hash
    const hashValue = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    // Generate evidence document (DOCX)
    const docxBuffer = await generateEvidenceDocx({
      evidenceNumber: displayEvidenceNumber,
      url,
      hash: hashValue,
      capturedAt,
      claimType: evidenceType,
      customClaimText,
      metadata,
    });

    // Upload PDF to Firebase Storage
    const pdfFileName = `captures/${jobId}/evidence.pdf`;
    const pdfFile = bucket.file(pdfFileName);
    await pdfFile.save(pdfBuffer, {
      metadata: {
        contentType: "application/pdf",
      },
    });
    await pdfFile.makePublic();
    const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${pdfFileName}`;

    // Upload DOCX to Firebase Storage
    const docxFileName = `captures/${jobId}/evidence_explanation.docx`;
    const docxFile = bucket.file(docxFileName);
    await docxFile.save(docxBuffer, {
      metadata: {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
    await docxFile.makePublic();
    const docxUrl = `https://storage.googleapis.com/${bucket.name}/${docxFileName}`;

    // Update job as done
    await db.collection("jobs").doc(jobId).update({
      status: "done",
      pdfUrl,
      docxUrl,
      hashValue,
      capturedAt: admin.firestore.Timestamp.fromDate(new Date()),
    });

    console.log(`Job ${jobId} completed successfully`);
  } catch (error: unknown) {
    console.error(`Job ${jobId} failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "キャプチャに失敗しました";
    await db.collection("jobs").doc(jobId).update({
      status: "error",
      errorMessage,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Express server
const server = express();
server.use(express.json());

// Health check endpoint
server.get("/", (req: Request, res: Response) => {
  res.status(200).send("WatchDog Capture Service is running");
});

// Create job endpoint (called from Vercel)
server.post("/jobs", async (req: Request, res: Response) => {
  try {
    const { url, evidenceNumber, evidenceType, customClaimText } = req.body;

    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job document in Firestore
    const jobData = {
      jobId,
      status: "pending" as const,
      url,
      evidenceNumber: evidenceNumber || "甲第1号証",
      evidenceType: evidenceType || "defamation",
      customClaimText: customClaimText || null,
      pdfUrl: null,
      docxUrl: null,
      hashValue: null,
      capturedAt: null,
      createdAt: admin.firestore.Timestamp.now(),
      errorMessage: null,
    };

    await db.collection("jobs").doc(jobId).set(jobData);

    // Start capture process asynchronously (don't await)
    capturePost(
      jobId,
      url,
      evidenceNumber || "甲第1号証",
      evidenceType || "defamation",
      customClaimText
    ).catch((err) => {
      console.error("Capture error:", err);
    });

    res.status(202).json({ jobId, message: "Capture started" });
  } catch (error) {
    console.error("Job creation error:", error);
    res.status(500).json({ error: "ジョブの作成に失敗しました" });
  }
});

// Get job status endpoint (called from Vercel for polling)
server.get("/jobs/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ error: "jobId is required" });
      return;
    }

    const jobDoc = await db.collection("jobs").doc(jobId).get();

    if (!jobDoc.exists) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const jobData = jobDoc.data();

    res.status(200).json({
      jobId: jobData?.jobId,
      status: jobData?.status,
      pdfUrl: jobData?.pdfUrl,
      docxUrl: jobData?.docxUrl,
      hashValue: jobData?.hashValue,
      capturedAt: jobData?.capturedAt?.toDate?.()?.toISOString() || null,
      evidenceNumber: jobData?.evidenceNumber,
      errorMessage: jobData?.errorMessage,
    });
  } catch (error) {
    console.error("Job status error:", error);
    res.status(500).json({ error: "ステータスの取得に失敗しました" });
  }
});

// Legacy capture endpoint (for backward compatibility)
server.post("/", async (req: Request, res: Response) => {
  const { jobId, url, evidenceNumber, evidenceType, customClaimText } = req.body;

  if (!jobId || !url) {
    res.status(400).json({ error: "jobId and url are required" });
    return;
  }

  // Start capture process asynchronously
  capturePost(
    jobId,
    url,
    evidenceNumber || "甲第1号証",
    evidenceType || "defamation",
    customClaimText
  ).catch((err) => {
    console.error("Capture error:", err);
  });

  res.status(202).json({ message: "Capture started", jobId });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WatchDog Capture Service listening on port ${PORT}`);
});
