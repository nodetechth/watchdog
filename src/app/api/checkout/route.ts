import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, TICKET_PRICE, TICKET_COUNT } from "@/lib/stripe";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `WatchDog チケット ${TICKET_COUNT}枚`,
              description: "証拠保全チケット（有効期限: 3ヶ月）",
            },
            unit_amount: TICKET_PRICE,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?payment=cancelled`,
      metadata: {
        userId: session.user.id,
        ticketCount: TICKET_COUNT.toString(),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
