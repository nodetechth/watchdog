export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { jobStore, userStore } from "@/lib/infra";
import { UserPlan } from "@/lib/infra/types";
import { runCapture } from "@/lib/capture/runner";
import { LegalClaimType } from "@/types";
import { waitUntil } from "@vercel/functions";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";

const INFRA_PROVIDER = process.env.INFRA_PROVIDER ?? "vercel";

// SQS client for AWS mode
const sqsClient =
  INFRA_PROVIDER === "aws"
    ? new SQSClient({
        region: process.env.AWS_REGION || "ap-northeast-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      })
    : null;

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

// Expiration durations
const GUEST_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const FREE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PAID_EXPIRATION_MS = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years

function getExpirationDate(plan: UserPlan): string {
  const now = Date.now();
  switch (plan) {
    case "paid":
      return new Date(now + PAID_EXPIRATION_MS).toISOString();
    case "free":
      return new Date(now + FREE_EXPIRATION_MS).toISOString();
    default:
      return new Date(now + GUEST_EXPIRATION_MS).toISOString();
  }
}

interface CreateJobRequest {
  url: string;
  evidenceNumber?: string;
  evidenceType?: LegalClaimType;
  customClaimText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateJobRequest = await request.json();

    // Validate URL
    if (!body.url || !body.url.includes("x.com/")) {
      return NextResponse.json(
        { error: "有効なX（旧Twitter）のURLを入力してください。" },
        { status: 400 }
      );
    }

    // Get session and user info
    const session = await auth();
    let userId: string | undefined;
    let userPlan: UserPlan = "guest";
    let useTicket = false;

    if (session?.user?.id) {
      userId = session.user.id;
      // ログインユーザーは常にfreeプランで開始
      // チケット使用はダッシュボードから手動で選択
      userPlan = "free";
    }

    // Generate job ID
    const jobId = uuidv4();
    const createdAt = new Date().toISOString();
    const expiresAt = getExpirationDate(userPlan);

    // Set defaults
    const evidenceNumber = body.evidenceNumber?.trim() || "甲第1号証";
    const evidenceType: LegalClaimType = body.evidenceType || "defamation";
    const customClaimText = body.customClaimText || null;

    // Create job in store
    await jobStore.createJob({
      jobId,
      url: body.url,
      evidenceNumber,
      evidenceType,
      customClaimText,
      createdAt,
      userId,
      userPlan,
      expiresAt,
      isPaid: useTicket,
    });

    // Consume ticket if using paid plan
    if (useTicket && userId) {
      const user = await userStore.getUser(userId);
      if (user && user.tickets && user.tickets > 0) {
        await userStore.updateUser(userId, {
          tickets: user.tickets - 1,
        });
      }
    }

    // Start capture process based on provider
    if (INFRA_PROVIDER === "aws") {
      // AWS mode: Send message to SQS
      if (!sqsClient || !SQS_QUEUE_URL) {
        return NextResponse.json(
          { error: "SQS キューが設定されていません" },
          { status: 500 }
        );
      }

      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: SQS_QUEUE_URL,
          MessageBody: JSON.stringify({
            jobId,
            url: body.url,
            evidenceNumber,
            evidenceType,
            customClaimText,
          }),
        })
      );
    } else {
      // Vercel mode: Use waitUntil for background processing
      waitUntil(
        runCapture(jobId, body.url, evidenceNumber, evidenceType, customClaimText)
      );
    }

    return NextResponse.json({ jobId, userPlan, expiresAt });
  } catch (error) {
    console.error("Job creation error:", error);
    const message =
      error instanceof Error ? error.message : "ジョブの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
