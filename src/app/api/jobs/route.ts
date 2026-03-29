import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { LegalClaimType } from "@/types";

/**
 * Job Registration API
 *
 * Creates a new capture job in Firestore and triggers Cloud Run processing.
 *
 * Required environment variable:
 * - CLOUD_RUN_URL: URL of the Cloud Run capture service
 *   Set in .env.local and Vercel dashboard.
 */

interface JobRequest {
  url: string;
  evidenceNumber: string;
  evidenceType: LegalClaimType;
  customClaimText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: JobRequest = await request.json();
    const { url, evidenceNumber, evidenceType, customClaimText } = body;

    // Validate URL
    if (!url || !url.includes("x.com/")) {
      return NextResponse.json(
        { error: "有効なX（旧Twitter）のURLを入力してください。" },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = uuidv4();

    // Get Firestore instance
    const db = getAdminDb();

    // Create job document
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
      createdAt: new Date(),
      errorMessage: null,
    };

    await db.collection("jobs").doc(jobId).set(jobData);

    // Trigger Cloud Run (fire-and-forget, don't wait for response)
    const cloudRunUrl = process.env.CLOUD_RUN_URL;
    if (cloudRunUrl) {
      // Don't await - let it process asynchronously
      fetch(cloudRunUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          url,
          evidenceNumber: evidenceNumber || "甲第1号証",
          evidenceType: evidenceType || "defamation",
          customClaimText: customClaimText || null,
        }),
      }).catch((err) => {
        console.error("Failed to trigger Cloud Run:", err);
        // Update job status to error if Cloud Run trigger fails
        db.collection("jobs").doc(jobId).update({
          status: "error",
          errorMessage: "キャプチャサービスの起動に失敗しました",
        });
      });
    } else {
      console.warn("CLOUD_RUN_URL is not configured");
      // For development/testing without Cloud Run
      await db.collection("jobs").doc(jobId).update({
        status: "error",
        errorMessage: "キャプチャサービスが設定されていません（CLOUD_RUN_URL）",
      });
    }

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Job creation error:", error);
    return NextResponse.json(
      { error: "ジョブの作成に失敗しました" },
      { status: 500 }
    );
  }
}
