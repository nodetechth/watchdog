import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userStore } from "@/lib/infra";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await userStore.getUser(session.user.id);

  if (!user) {
    return NextResponse.json({ tickets: 0, expiresAt: null });
  }

  const now = new Date();
  const isExpired =
    user.ticketsExpiresAt && new Date(user.ticketsExpiresAt) < now;

  return NextResponse.json({
    tickets: isExpired ? 0 : user.tickets || 0,
    expiresAt: isExpired ? null : user.ticketsExpiresAt || null,
  });
}
