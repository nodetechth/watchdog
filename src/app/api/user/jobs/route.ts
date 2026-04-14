import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jobStore } from "@/lib/infra";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const jobs = await jobStore.listJobsByUser(session.user.id);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Failed to fetch user jobs:", error);
    return NextResponse.json(
      { error: "ジョブの取得に失敗しました" },
      { status: 500 }
    );
  }
}
