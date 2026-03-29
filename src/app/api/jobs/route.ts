import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid";
import { LegalClaimType } from "@/types";

/**
 * Job Registration API
 *
 * Creates a new capture job in DynamoDB and sends a message to SQS.
 *
 * Required environment variables:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - SQS_QUEUE_URL
 * - DYNAMODB_TABLE_NAME
 */

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE_NAME || "watchdog-jobs";
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || "";

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

    // Check configuration
    if (!SQS_QUEUE_URL) {
      return NextResponse.json(
        { error: "SQS キューが設定されていません" },
        { status: 500 }
      );
    }

    // Generate job ID
    const jobId = uuidv4();
    const createdAt = new Date().toISOString();

    // Create job in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: DYNAMODB_TABLE,
        Item: {
          jobId,
          status: "pending",
          url,
          evidenceNumber: evidenceNumber || "甲第1号証",
          evidenceType: evidenceType || "defamation",
          customClaimText: customClaimText || null,
          pdfKey: null,
          docxKey: null,
          hashValue: null,
          capturedAt: null,
          createdAt,
          errorMessage: null,
        },
      })
    );

    // Send message to SQS
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          jobId,
          url,
          evidenceNumber: evidenceNumber || "甲第1号証",
          evidenceType: evidenceType || "defamation",
          customClaimText: customClaimText || null,
        }),
      })
    );

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Job creation error:", error);
    const message = error instanceof Error ? error.message : "ジョブの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
