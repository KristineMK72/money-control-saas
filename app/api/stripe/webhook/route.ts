import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // required for raw body + Stripe signature

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Service-role client so we can update any profile from the webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // must be set in Vercel
  { auth: { persistSession: false } }
);

async function setPremium(
  userId: string,
  opts: {
    isPremium: boolean;
    status: string;
    customerId?: string | null;
    subscriptionId?: string | null;
  }
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      is_premium: opts.isPremium,
      premium_status: opts.status,
      stripe_customer_id: opts.customerId ?? null,
      stripe_subscription_id: opts.subscriptionId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update profile premium status:", error);
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ||
          session.metadata?.user_id ||
          null;

        if (userId && session.mode === "subscription") {
          await setPremium(userId, {
            isPremium: true,
            status: "active",
            customerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? null,
            subscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) {
          const active = ["active", "trialing"].includes(sub.status);
          await setPremium(userId, {
            isPremium: active,
            status: sub.status,
            customerId:
              typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
            subscriptionId: sub.id,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await setPremium(userId, {
            isPremium: false,
            status: "canceled",
            customerId:
              typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
            subscriptionId: sub.id,
          });
        }
        break;
      }

      default:
        // ignore other events
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
