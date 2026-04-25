import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle subscription events here
  switch (event.type) {
    case "checkout.session.completed":
      console.log("Checkout session completed:", event.data.object);
      break;
    case "customer.subscription.created":
      console.log("Subscription created:", event.data.object);
      break;
    case "customer.subscription.updated":
      console.log("Subscription updated:", event.data.object);
      break;
    case "customer.subscription.deleted":
      console.log("Subscription deleted:", event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
