export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/infra";

/**
 * Private Blob用のダウンロードプロキシ
 * サーバーサイドでBlobを取得し、クライアントにストリーミング
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; type: string }> }
) {
  try {
    const { jobId, type } = await params;

    if (!jobId || !["pdf", "docx"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid request" },
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

    if (job.status !== "done") {
      return NextResponse.json(
        { error: "Job not completed" },
        { status: 400 }
      );
    }

    const blobUrl = type === "pdf" ? job.pdfKey : job.docxKey;

    if (!blobUrl) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // サーバーサイドでBlobを取得（BLOB_READ_WRITE_TOKENで認証）
    const response = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`Blob fetch failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "ファイルの取得に失敗しました" },
        { status: 500 }
      );
    }

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Content-Type と ファイル名を設定
    const contentType = type === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const extension = type === "pdf" ? "pdf" : "docx";
    const filename = `evidence_${jobId}.${extension}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "ダウンロードに失敗しました" },
      { status: 500 }
    );
  }
}
