import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Plan = "monthly" | "yearly";

const priceEnv: Record<Plan, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
};
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to start checkout." },
      { status: 401 }
    );
  }

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
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/signup?plan=${plan}&checkout=success`,
    cancel_url: `${origin}/signup?plan=${plan}&checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      user_id: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
