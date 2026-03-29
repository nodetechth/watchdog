import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Job Status Polling API
 *
 * Returns the current status of a capture job.
 * For completed jobs, generates presigned URLs for S3 objects.
 *
 * Required environment variables:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - DYNAMODB_TABLE_NAME
 * - S3_BUCKET_NAME
 */

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE_NAME || "watchdog-jobs";
const S3_BUCKET = process.env.S3_BUCKET_NAME || "watchdog-evidence-pdfs";
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

async function generatePresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRY });
}

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

    // Get job from DynamoDB
    const result = await docClient.send(
      new GetCommand({
        TableName: DYNAMODB_TABLE,
        Key: { jobId },
      })
    );

    if (!result.Item) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const job = result.Item;

    // Generate presigned URLs for completed jobs
    let pdfUrl = null;
    let docxUrl = null;

    if (job.status === "done") {
      if (job.pdfKey) {
        pdfUrl = await generatePresignedUrl(job.pdfKey);
      }
      if (job.docxKey) {
        docxUrl = await generatePresignedUrl(job.docxKey);
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
    });
  } catch (error) {
    console.error("Job status error:", error);
    return NextResponse.json(
      { error: "ステータスの取得に失敗しました" },
      { status: 500 }
    );
  }
}
