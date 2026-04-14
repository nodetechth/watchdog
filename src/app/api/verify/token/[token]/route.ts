import { NextRequest, NextResponse } from "next/server";
import { jobStore, blobStore, verificationTokenStore } from "@/lib/infra";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "トークンが必要です" },
        { status: 400 }
      );
    }

    // Get verification token
    const verificationToken = await verificationTokenStore.getTokenByToken(token);

    if (!verificationToken) {
      return NextResponse.json(
        { error: "トークンが見つかりません", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if revoked
    if (verificationToken.isRevoked) {
      return NextResponse.json(
        { error: "このリンクは無効化されています。証拠の所有者に再発行を依頼してください。", code: "REVOKED" },
        { status: 410 }
      );
    }

    // Check if expired
    if (new Date(verificationToken.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "このリンクは期限切れです。証拠の所有者に再発行を依頼してください。", code: "EXPIRED" },
        { status: 410 }
      );
    }

    // Get job
    const job = await jobStore.getJob(verificationToken.jobId);
    if (!job) {
      return NextResponse.json(
        { error: "証拠が見つかりません", code: "JOB_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Verify job is still paid (5-year storage)
    if (!job.isPaid) {
      return NextResponse.json(
        { error: "この証拠は5年間保存ではありません", code: "NOT_PAID" },
        { status: 403 }
      );
    }

    // Get PNG signed URL
    let pngUrl: string | null = null;

    // Find the screenshot key - it's stored in a predictable location
    // The screenshot is saved as screenshots/{jobId}.png
    // But we need to find it from the blob store
    // Since we don't store the screenshotKey separately, we'll construct it
    // Actually, looking at the capture runner, the screenshot is saved but the key isn't stored in the job
    // We need to use the pdfKey pattern to derive the screenshot URL

    if (job.pdfKey) {
      // pdfKey is like: https://....blob.vercel-storage.com/pdfs/{jobId}.pdf
      // screenshotKey should be: https://....blob.vercel-storage.com/screenshots/{jobId}.png
      const screenshotKey = job.pdfKey.replace(/pdfs\/[^/]+\.pdf$/, `screenshots/${job.jobId}.png`);
      try {
        pngUrl = await blobStore.getSignedUrl(screenshotKey, 7 * 24 * 60 * 60);
      } catch (error) {
        console.error("Failed to get PNG URL:", error);
        // PNG might not exist for older jobs
      }
    }

    // Extract poster ID from URL (e.g., @username from https://x.com/username/status/...)
    let posterId = "";
    const urlMatch = job.url.match(/x\.com\/([^/]+)\/status/);
    if (urlMatch) {
      posterId = `@${urlMatch[1]}`;
    }

    return NextResponse.json({
      jobId: job.jobId,
      metadata: {
        posterId,
        postedAt: null, // Not stored in current schema
        capturedAt: job.capturedAt,
        tweetUrl: job.url,
      },
      pngUrl,
      hashValue: job.hashValue,
      txHash: job.txHash,
      explorerUrl: job.explorerUrl,
      expiresAt: verificationToken.expiresAt,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { error: "トークンの検証に失敗しました" },
      { status: 500 }
    );
  }
}
