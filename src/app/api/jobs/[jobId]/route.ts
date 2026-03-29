import { NextRequest, NextResponse } from "next/server";

/**
 * Job Status Polling API
 *
 * Proxies status requests to Cloud Run, which handles Firestore operations.
 * This avoids needing Firebase Admin credentials on Vercel.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
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

    // Get job status from Cloud Run
    const response = await fetch(`${cloudRunUrl}/jobs/${jobId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }
      throw new Error("ステータスの取得に失敗しました");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "ステータスの取得に失敗しました" },
      { status: 500 }
    );
  }
}
