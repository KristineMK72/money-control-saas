"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";
import SubscriptionOptions from "@/components/SubscriptionOptions";

type Mode = "signup" | "login";

export default function SignupPage() {
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("signup");
  const [plan, setPlan] = useState<string>("free");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const incomingPlan = params.get("plan");
    if (incomingPlan === "monthly" || incomingPlan === "yearly") {
      setPlan(incomingPlan);
    }

    const incomingMode = params.get("mode");
    if (incomingMode === "login" || incomingMode === "signup") {
      setMode(incomingMode);
    }

    const checkout = params.get("checkout");
    if (checkout === "success") {
      setMessage("Stripe checkout complete. Create or log into your account to finish setup.");
    }
    if (checkout === "cancelled") {
      setMessage("Checkout was cancelled. Your selected plan is still here.");
    }
  }, []);

  const planLabel = useMemo(() => {
    if (plan === "monthly") return "$5/month";
    if (plan === "yearly") return "$39/year";
    return "Free";
  }, [plan]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!displayName.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password should be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          selected_plan: plan,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      plan === "free"
        ? "Account created. Check your email for confirmation, then log in."
        : "Account created. Check your email, then continue to Stripe for your subscription."
    );
    setMode("login");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-zinc-950/90 backdrop-blur-md text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/40 bg-zinc-950/70 p-8 shadow-2xl backdrop-blur-xl">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Get started
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>

            <p className="mt-4 max-w-xl text-white/70">
              {mode === "signup"
                ? "Start with a clean financial plan and build calm around what to pay first."
                : "Log in to continue with your bills, forecast, payments, and crisis planning."}
            </p>

            <div className="mt-8 rounded-2xl border border-white/25 bg-white/10 p-5 shadow-xl backdrop-blur">
              <div className="text-sm font-semibold text-white/70">Selected plan</div>
              <div className="mt-2 text-2xl font-black">{planLabel}</div>
              <div className="mt-2 text-sm text-white/60">
                {plan === "free"
                  ? "You can start free now and upgrade later."
                  : "You selected a paid plan. Stripe checkout is ready when you are."}
              </div>
              {plan !== "free" ? (
                <StripeCheckoutButton
                  plan={plan === "yearly" ? "yearly" : "monthly"}
                  className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-black text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-60"
                >
                  Continue to Stripe
                </StripeCheckoutButton>
              ) : null}
            </div>

            <SubscriptionOptions
              selectedPlan={plan}
              onSelectPlan={setPlan}
              compact
              className="mt-5"
            />

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  mode === "signup"
                    ? "bg-cyan-400 text-black"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Create account
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  mode === "login"
                    ? "bg-cyan-400 text-black"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Login
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/95 p-8 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl">
            <h2 className="text-2xl font-black">
              {mode === "signup" ? "Create account" : "Login"}
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              {mode === "signup"
                ? "Use your name, email, and create a password to get started."
                : "Enter your email and password to continue."}
            </p>

            <form
              onSubmit={mode === "signup" ? handleSignup : handleLogin}
              className="mt-6 space-y-4"
            >
              {mode === "signup" ? (
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-zinc-400"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              ) : null}

              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-zinc-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-zinc-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {mode === "signup" ? (
                <input
                  type="password"
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-zinc-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              ) : null}

              <button
                disabled={loading}
                className="w-full rounded-xl bg-zinc-950 p-3 font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                {loading
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Logging in..."
                  : mode === "signup"
                  ? "Create account"
                  : "Login"}
              </button>
            </form>

            {message ? (
              <p className="mt-4 text-sm text-zinc-600">{message}</p>
            ) : null}

            <div className="mt-6 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
              {mode === "signup" ? (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setMessage("");
                    }}
                    className="font-semibold text-zinc-950 underline"
                  >
                    Log in
                  </button>
                </p>
              ) : (
                <p>
                  Need an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setMessage("");
                    }}
                    className="font-semibold text-zinc-950 underline"
                  >
                    Create one
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
