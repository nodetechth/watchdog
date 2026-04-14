import { NextRequest, NextResponse } from "next/server";
import { jobStore, userStore } from "@/lib/infra";
import { auth } from "@/lib/auth";

// 5年間の保存期限
const PAID_EXPIRATION_MS = 5 * 365 * 24 * 60 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // セッション確認
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ジョブ取得
    const job = await jobStore.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "ジョブが見つかりません" },
        { status: 404 }
      );
    }

    // ジョブの所有者確認
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: "このジョブにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // すでに課金済みの場合
    if (job.isPaid) {
      return NextResponse.json(
        { error: "このジョブはすでにチケットが使用されています" },
        { status: 400 }
      );
    }

    // ジョブが完了していない場合
    if (job.status !== "done") {
      return NextResponse.json(
        { error: "処理が完了していないジョブにはチケットを使用できません" },
        { status: 400 }
      );
    }

    // ユーザーのチケット確認
    const user = await userStore.getUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: "ユーザー情報が見つかりません" },
        { status: 404 }
      );
    }

    const tickets = user.tickets || 0;
    const ticketsExpiresAt = user.ticketsExpiresAt;
    const isTicketExpired = ticketsExpiresAt && new Date(ticketsExpiresAt) < new Date();

    if (tickets <= 0 || isTicketExpired) {
      return NextResponse.json(
        { error: "有効なチケットがありません。チケットを購入してください。" },
        { status: 400 }
      );
    }

    // チケットを消費
    await userStore.updateUser(userId, {
      tickets: tickets - 1,
    });

    // ジョブを更新（課金済み、有料プラン、5年保存）
    const newExpiresAt = new Date(Date.now() + PAID_EXPIRATION_MS).toISOString();
    await jobStore.updateJob(jobId, {
      isPaid: true,
      userPlan: "paid",
      expiresAt: newExpiresAt,
    });

    return NextResponse.json({
      success: true,
      message: "チケットを使用しました。証拠データをダウンロードできます。",
      remainingTickets: tickets - 1,
      expiresAt: newExpiresAt,
    });
  } catch (error) {
    console.error("Use ticket error:", error);
    return NextResponse.json(
      { error: "チケットの使用に失敗しました" },
      { status: 500 }
    );
  }
}
