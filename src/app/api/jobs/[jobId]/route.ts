export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/infra";

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

    const job = await jobStore.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Check if job has expired
    const now = new Date();
    const isExpired = job.expiresAt && new Date(job.expiresAt) < now;

    if (isExpired) {
      return NextResponse.json({
        jobId: job.jobId,
        status: "expired",
        pdfUrl: null,
        docxUrl: null,
        hashValue: job.hashValue || null,
        capturedAt: job.capturedAt || null,
        evidenceNumber: job.evidenceNumber || null,
        errorMessage: "このデータは保存期限が切れています",
        txHash: job.txHash || null,
        explorerUrl: job.explorerUrl || null,
        userPlan: job.userPlan || "guest",
        expiresAt: job.expiresAt || null,
        isPaid: job.isPaid || false,
      });
    }

    // Generate download URLs only when job is done AND user has paid
    // Private Blobストアのため、プロキシAPI経由でダウンロード
    let pdfUrl = null;
    let docxUrl = null;

    if (job.status === "done" && job.isPaid) {
      if (job.pdfKey) {
        pdfUrl = `/api/download/${jobId}/pdf`;
      }
      if (job.docxKey) {
        docxUrl = `/api/download/${jobId}/docx`;
      }
    }

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      pdfUrl,
      docxUrl,
      hashValue: job.hashValue || null,
      capturedAt: job.capturedAt || null,
      evidenceNumber: job.evidenceNumber || null,
      errorMessage: job.errorMessage || null,
      txHash: job.txHash || null,
      explorerUrl: job.explorerUrl || null,
      userPlan: job.userPlan || "guest",
      expiresAt: job.expiresAt || null,
      isPaid: job.isPaid || false,
    });
  } catch (error) {
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "ステータスの取得に失敗しました" },
      { status: 500 }
    );
  }
}
