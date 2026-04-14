import { NextRequest, NextResponse } from "next/server";
import { getStripe, TICKET_COUNT, TICKET_VALIDITY_DAYS } from "@/lib/stripe";
import { userStore } from "@/lib/infra";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const ticketCount = parseInt(session.metadata?.ticketCount || "0", 10);

    if (userId && ticketCount > 0) {
      try {
        const user = await userStore.getUser(userId);
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + TICKET_VALIDITY_DAYS * 24 * 60 * 60 * 1000
        );

        // Add tickets to existing count if not expired
        let newTickets = ticketCount;
        if (user?.tickets && user.ticketsExpiresAt) {
          const currentExpiry = new Date(user.ticketsExpiresAt);
          if (currentExpiry > now) {
            newTickets = user.tickets + ticketCount;
          }
        }

        await userStore.updateUser(userId, {
          tickets: newTickets,
          ticketsExpiresAt: expiresAt.toISOString(),
          plan: "paid",
        });

        console.log(`[Stripe] Issued ${ticketCount} tickets to user ${userId}`);
      } catch (error) {
        console.error("Failed to update user tickets:", error);
        return NextResponse.json(
          { error: "Failed to process payment" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
