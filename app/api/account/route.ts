import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type DeleteAccountBody = {
  password?: unknown;
  emailConfirmation?: unknown;
};

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function cancelSubscriptions({
  subscriptionId,
  customerId,
}: {
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  if (!subscriptionId && !customerId) return;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured to cancel the active subscription.");
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
  const subscriptionIds = new Set<string>();
  if (subscriptionId) subscriptionIds.add(subscriptionId);

  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    for (const subscription of subscriptions.data) {
      if (
        subscription.status !== "canceled" &&
        subscription.status !== "incomplete_expired"
      ) {
        subscriptionIds.add(subscription.id);
      }
    }
  }

  for (const id of subscriptionIds) {
    try {
      await stripe.subscriptions.cancel(id);
    } catch (error) {
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        error.code === "resource_missing"
      ) {
        continue;
      }
      throw error;
    }
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json(
      { error: "Please sign in again before deleting your account." },
      { status: 401 }
    );
  }

  const raw = await request.text();
  if (raw.length > 8_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: DeleteAccountBody;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const emailConfirmation =
    typeof body.emailConfirmation === "string"
      ? body.emailConfirmation.trim().toLowerCase()
      : "";

  if (!password || emailConfirmation !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Enter your current password and exact email address." },
      { status: 400 }
    );
  }

  const { data: reauthenticated, error: reauthError } =
    await supabase.auth.signInWithPassword({ email: user.email, password });
  if (reauthError || reauthenticated.user?.id !== user.id) {
    return NextResponse.json(
      { error: "Password verification failed." },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Account deletion is not configured." },
      { status: 503 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle<{
      stripe_subscription_id?: string | null;
      stripe_customer_id?: string | null;
    }>();

  if (profileError) {
    console.error("Account deletion profile lookup failed:", profileError.code);
    return NextResponse.json(
      { error: "Account deletion could not be completed safely." },
      { status: 500 }
    );
  }

  try {
    await cancelSubscriptions({
      subscriptionId: profile?.stripe_subscription_id,
      customerId: profile?.stripe_customer_id,
    });

    // These analytics tables retain rows by setting user_id to null when an
    // auth user is deleted. Remove the user's rows first instead of anonymizing.
    for (const table of ["product_events", "visitors"] as const) {
      const { error } = await admin.from(table).delete().eq("user_id", user.id);
      if (error) throw new Error(`${table}:${error.code ?? "delete_failed"}`);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
  } catch (error) {
    console.error(
      "Account deletion failed:",
      error instanceof Error ? error.name : "unknown"
    );
    return NextResponse.json(
      {
        error:
          "Account deletion could not be completed safely. Please contact support.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
