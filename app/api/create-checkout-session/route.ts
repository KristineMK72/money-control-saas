import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const PRICE_IDS: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
};

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const plan = searchParams.get("plan") ?? "";

  // Validate plan
  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.json(
      { error: "Invalid or missing plan. Use ?plan=monthly or ?plan=yearly." },
      { status: 400 }
    );
  }

  const priceId = PRICE_IDS[plan]!;

  // Require login — Stripe needs to know who is buying
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Send them to login and bring them back here after
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", `/api/create-checkout-session?plan=${plan}`);
    return NextResponse.redirect(loginUrl.toString(), 303);
  }

  // Use env var if set, otherwise fall back to current origin
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      // Critical: pass user_id so the webhook can upgrade the right account
      client_reference_id: user.id,
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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/signup?plan=${plan}`,
    });

    return NextResponse.redirect(session.url!, 303);
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
