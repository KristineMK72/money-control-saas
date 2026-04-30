"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function SignupForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isPremium = plan === "monthly" || plan === "yearly";
  const isMonthly = plan === "monthly";

  const checkoutUrl = `/api/create-checkout-session?plan=${plan}`;

  /** Try to sign in first; if account doesn't exist, sign up. */
  async function authenticate(): Promise<{
    ok: boolean;
    needsEmailConfirm: boolean;
  }> {
    // Try sign in first
    const signIn = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signIn.data.session) {
      return { ok: true, needsEmailConfirm: false };
    }

    // If sign-in failed because invalid credentials, try sign up
    const signUp = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${
          isPremium ? `?next=${encodeURIComponent(checkoutUrl)}` : ""
        }`,
      },
    });

    if (signUp.error) {
      // Real signup error (e.g., weak password)
      setError(signUp.error.message);
      return { ok: false, needsEmailConfirm: false };
    }

    // Empty identities → email already exists, but the password we tried was wrong
    if (
      signUp.data.user &&
      signUp.data.user.identities &&
      signUp.data.user.identities.length === 0
    ) {
      setError(
        "This email is already registered, but the password is wrong. Try logging in or reset your password."
      );
      return { ok: false, needsEmailConfirm: false };
    }

    if (signUp.data.session) {
      return { ok: true, needsEmailConfirm: false };
    }

    // Signed up but needs email confirmation
    return { ok: true, needsEmailConfirm: true };
  }

  async function handleSubmit() {
    setError("");

    if (!email.trim() || !password) {
      setError("Enter an email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { ok, needsEmailConfirm } = await authenticate();

    if (!ok) {
      setLoading(false);
      return;
    }

    if (needsEmailConfirm) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    // Good to go — premium goes to Stripe, free goes to dashboard
    if (isPremium) {
      window.location.href = checkoutUrl;
    } else {
      window.location.href = "/dashboard";
    }
  }

  /* ─────────────────────────────
     CONFIRM EMAIL SUCCESS VIEW
  ──────────────────────────── */
  if (success) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-10">
        <div className="mx-auto max-w-md space-y-6 text-center">
          <div className="text-6xl">📬</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Check your email
          </h1>
          <p className="text-sm text-zinc-400">
            We sent a confirmation link to{" "}
            <span className="text-white font-semibold">{email}</span>. Tap it
            to finish setting up your account
            {isPremium ? " — then we'll send you to checkout." : "."}
          </p>
          <p className="text-xs text-zinc-500">
            Didn't get it? Check your spam folder or{" "}
            <button
              onClick={() => {
                setSuccess(false);
                setError("");
              }}
              className="text-cyan-300 hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      </main>
    );
  }

  /* ─────────────────────────────
     PREMIUM CHECKOUT VIEW
  ──────────────────────────── */
  if (isPremium) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-10">
        <div className="mx-auto max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Upgrade to Premium
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Create your account, then we'll send you to secure checkout.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/70 p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-zinc-400">You selected</p>
              <p className="text-2xl font-bold text-emerald-300">
                {isMonthly ? "$5/mo" : "$39/yr"}
              </p>
            </div>

            <ul className="space-y-2 text-sm text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald
