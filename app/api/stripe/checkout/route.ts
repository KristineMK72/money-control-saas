import { NextResponse } from "next/server";
import Stripe from "stripe";

type Plan = "monthly" | "yearly";

const priceEnv: Record<Plan, string | undefined> = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
  yearly: process.env.STRIPE_YEARLY_PRICE_ID,
};

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: Plan };
  const plan = body.plan === "yearly" ? "yearly" : "monthly";
  const price = priceEnv[plan];

  if (!price) {
    return NextResponse.json(
      { error: `Missing Stripe price id for ${plan}.` },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^/, "https://") ||
    new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/signup?plan=${plan}&checkout=success`,
    cancel_url: `${origin}/signup?plan=${plan}&checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { plan },
  });

  return NextResponse.json({ url: session.url });
}
