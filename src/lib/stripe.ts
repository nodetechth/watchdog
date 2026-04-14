import Stripe from "stripe";

export const TICKET_PRICE = 980;
export const TICKET_COUNT = 5;
export const TICKET_VALIDITY_DAYS = 90; // 3 months

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return stripeClient;
}
