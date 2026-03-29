import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Job Status Polling API
 *
 * Returns the current status of a capture job.
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

    const db = getAdminDb();
    const jobDoc = await db.collection("jobs").doc(jobId).get();

    if (!jobDoc.exists) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();

    return NextResponse.json({
      jobId: jobData?.jobId,
      status: jobData?.status,
      pdfUrl: jobData?.pdfUrl,
      docxUrl: jobData?.docxUrl,
      hashValue: jobData?.hashValue,
      capturedAt: jobData?.capturedAt?.toDate?.()?.toISOString() || jobData?.capturedAt,
      evidenceNumber: jobData?.evidenceNumber,
      errorMessage: jobData?.errorMessage,
    });
  } catch (error) {
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "ステータスの取得に失敗しました" },
      { status: 500 }
    );
  }
}
