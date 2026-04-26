// /app/api/stripe-webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      await supabase
        .from("profiles")
        .update({
          is_premium: true,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        })
        .eq("id", session.client_reference_id);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;

      await supabase
        .from("profiles")
        .update({
          is_premium: false,
        })
        .eq("stripe_subscription_id", subscription.id);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
