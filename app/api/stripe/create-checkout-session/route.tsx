import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID!;

  const customer = await stripe.customers.create({
    metadata: { user_id: session.user.id },
    email: session.user.email ?? undefined,
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?sub=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/upgrade?canceled=1`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
