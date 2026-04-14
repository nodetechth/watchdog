import { NextResponse } from "next/server";
import { jobStore, blobStore } from "@/lib/infra";

export const maxDuration = 60;

/**
 * 期限切れジョブの自動削除API
 * Vercel Cronで毎日実行される
 */
export async function GET() {
  try {
    const jobs = await jobStore.listAllJobs();
    const now = new Date();
    let deletedCount = 0;
    let errorCount = 0;

    for (const job of jobs) {
      // Check if job has expired
      if (job.expiresAt && new Date(job.expiresAt) < now) {
        try {
          // Delete PDF from Blob storage
          if (job.pdfKey) {
            await blobStore.delete(job.pdfKey);
          }

          // Delete DOCX from Blob storage
          if (job.docxKey) {
            await blobStore.delete(job.docxKey);
          }

          // Delete job from Redis
          await jobStore.deleteJob(job.jobId);

          deletedCount++;
          console.log(`[Cleanup] Deleted expired job: ${job.jobId}`);
        } catch (error) {
          errorCount++;
          console.error(`[Cleanup] Failed to delete job ${job.jobId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      errorCount,
      totalChecked: jobs.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Cleanup] Error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
