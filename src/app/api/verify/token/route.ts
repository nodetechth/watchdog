import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jobStore, verificationTokenStore } from "@/lib/infra";

const TOKEN_VALIDITY_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobIdが必要です" },
        { status: 400 }
      );
    }

    // Get job and verify ownership
    const job = await jobStore.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "証拠が見つかりません" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (job.userId !== session.user.id) {
      return NextResponse.json(
        { error: "この証拠にアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Check if job is paid (5-year storage)
    if (!job.isPaid) {
      return NextResponse.json(
        { error: "5年間保存にアップグレード済みの証拠のみ共有リンクを発行できます" },
        { status: 403 }
      );
    }

    // Revoke existing tokens for this job
    await verificationTokenStore.revokeTokensByJobId(jobId);

    // Create new token
    const expiresAt = new Date(
      Date.now() + TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const verificationToken = await verificationTokenStore.createToken({
      jobId,
      createdBy: session.user.id,
      expiresAt,
    });

    // Build the verification URL
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const url = `${protocol}://${host}/verify?token=${verificationToken.token}`;

    return NextResponse.json({
      token: verificationToken.token,
      url,
      expiresAt: verificationToken.expiresAt,
    });
  } catch (error) {
    console.error("Token creation error:", error);
    return NextResponse.json(
      { error: "トークンの発行に失敗しました" },
      { status: 500 }
    );
  }
}
