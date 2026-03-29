import { NextRequest, NextResponse } from "next/server";
import { LegalClaimType } from "@/types";

/**
 * Job Registration API
 *
 * Proxies job creation to Cloud Run, which handles Firestore operations.
 * This avoids needing Firebase Admin credentials on Vercel.
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

    const cloudRunUrl = process.env.CLOUD_RUN_URL;
    if (!cloudRunUrl) {
      return NextResponse.json(
        { error: "キャプチャサービスが設定されていません" },
        { status: 500 }
      );
    }

    // Send request to Cloud Run to create and process the job
    const response = await fetch(`${cloudRunUrl}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        evidenceNumber: evidenceNumber || "甲第1号証",
        evidenceType: evidenceType || "defamation",
        customClaimText: customClaimText || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "ジョブの作成に失敗しました");
    }

    const data = await response.json();
    return NextResponse.json({ jobId: data.jobId });
  } catch (error) {
    console.error("Job creation error:", error);
    const message = error instanceof Error ? error.message : "ジョブの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
