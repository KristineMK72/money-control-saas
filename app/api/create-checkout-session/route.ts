// /app/api/create-checkout-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const PRICE_IDS = {
  monthly: "price_1TQW5ZCIlql4ybeVyTKXr9oO",
  yearly: "price_1TQWGmCIlql4ybeVMxu6eWtkw",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan");

  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PRICE_IDS[plan],
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
  });

  return NextResponse.redirect(session.url!, 303);
}
