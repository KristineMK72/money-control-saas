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

  async function authenticate(): Promise<{
    ok: boolean;
    needsEmailConfirm: boolean;
  }> {
    const signIn = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signIn.data.session) {
      return { ok: true, needsEmailConfirm: false };
    }

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
      setError(signUp.error.message);
      return { ok: false, needsEmailConfirm: false };
    }

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

    if (isPremium) {
      window.location.href = checkoutUrl;
    } else {
      window.location.href = "/dashboard";
    }
  }

  // Confirm-email success view
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

  // Premium checkout view
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
                <span className="text-emerald-400 mt-0.5">✓</span>
                Unlimited Ask Ben conversations
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                Full forecast & scenario testing
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                Credit health & recovery tools
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                Cancel anytime
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Email</label>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 pr-16 text-sm focus:border-emerald-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Already have an account? Just enter your existing password.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold py-3 text-sm transition disabled:opacity-50"
            >
              {loading ? "Loading…" : "Continue to Stripe Checkout →"}
            </button>

            <p className="text-center text-xs text-zinc-500">
              Secure payment by Stripe. Cancel anytime.
            </p>
          </div>

          <p className="text-center text-sm text-zinc-500">
            Want the free version?{" "}
            <a href="/signup" className="text-cyan-300 hover:underline">
              Create a free account instead
            </a>
          </p>
        </div>
      </main>
    );
  }

  // Free signup view (default)
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Create your free account
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Start tracking your bills, debts, and income in seconds.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Email</label>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 pr-16 text-sm focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold py-3 text-sm transition disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Free Account"}
          </button>

          <p className="text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <a href="/login" className="text-cyan-300 hover:underline">
              Log in
            </a>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
          <p className="text-xs text-zinc-400">Want more?</p>
          <p className="text-sm font-semibold text-emerald-300 mt-1">
            <a href="/signup?plan=monthly" className="hover:underline">
              Upgrade to Premium for $5/month →
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 text-white px-4 py-10">
          <div className="mx-auto max-w-md">
            <p className="text-sm text-zinc-500">Loading…</p>
          </div>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
