"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";
import SubscriptionOptions from "@/components/SubscriptionOptions";

type Mode = "signup" | "login";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white p-4 text-base font-bold text-zinc-950 outline-none focus:border-cyan-400";

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
      setMessage(
        "Stripe checkout complete. Create or log into your account to finish setup.",
      );
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

    const cleanEmail = email.trim();

    if (!displayName.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    if (!cleanEmail) {
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
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
        : "Account created. Check your email, then continue to Stripe for your subscription.",
    );

    setMode("login");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const requested = new URLSearchParams(window.location.search).get("next");
    window.location.href = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/world";
  }

  return (

    <main className="min-h-screen bg-zinc-950/90 px-4 py-10 text-white backdrop-blur-md">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/30 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-xl">
          <div className="inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
            Welcome to Franklin&apos;s Landing
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            {mode === "signup" ? "Create your account." : "Welcome back."}
            <span className="block text-cyan-300">
              Rebuild your Treasury.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/75">
            {mode === "signup"
              ? "Start free, track what matters, and let Ben help you decide what needs attention first."
              : "Sign in to continue your bills, forecast, payments, debt campaign, and Franklin’s Landing progress."}
          </p>

          <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold leading-7 text-cyan-50">
            No shame. No confusing spreadsheets. Just calm money triage,
            witty colonial encouragement, and a path back to control.
          </div>

          <div className="mt-6 rounded-2xl border border-white/25 bg-white/10 p-5 shadow-xl backdrop-blur">
            <div className="text-sm font-bold text-white/70">
              Selected plan
            </div>

            <div className="mt-2 text-2xl font-black">{planLabel}</div>

            <div className="mt-2 text-sm font-semibold text-white/60">
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
                setPassword("");
              }}
              className={`rounded-xl px-5 py-3 text-sm font-black ${
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
                setConfirmPassword("");
              }}
              className={`rounded-xl px-5 py-3 text-sm font-black ${
                mode === "login"
                  ? "bg-cyan-400 text-black"
                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              Login
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/30 bg-slate-950/85 p-8 text-white shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <img
              src="/ben-head.png"
              alt="Ben"
              className="mx-auto mb-4 h-28 w-28 rounded-3xl bg-white p-3 shadow-xl"
            />

            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
              {mode === "signup" ? "New Governor" : "Governor Login"}
            </p>

            <h2 className="mt-3 text-4xl font-black">
              {mode === "signup" ? "Create account" : "Welcome Back"}
            </h2>

            <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
              {mode === "signup"
                ? "Use your name, email, and create a password to get started."
                : "Sign in to AskBen and continue rebuilding your Treasury."}
            </p>
          </div>

          <form
            onSubmit={mode === "signup" ? handleSignup : handleLogin}
            className="mt-6 grid gap-4"
          >
            {mode === "signup" ? (
              <input
                type="text"
                placeholder="Your name"
                autoComplete="name"
                className={inputClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            ) : null}

            <input
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {mode === "login" ? (
              <div className="text-right">
                <a
                  href="/forgot-password"
                  className="text-sm font-black text-cyan-300 hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            ) : null}

            {mode === "signup" ? (
              <input
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50">
                {message}
              </div>
            ) : null}

            <button
              disabled={loading}
              className={
                mode === "login"
                  ? "w-full rounded-xl bg-emerald-500 p-4 text-xl font-black text-black transition hover:opacity-90 disabled:opacity-60"
                  : "w-full rounded-xl bg-cyan-400 p-4 text-xl font-black text-black transition hover:opacity-90 disabled:opacity-60"
              }
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

          <div className="mt-6 border-t border-white/15 pt-6 text-center text-sm font-semibold text-white/65">
            {mode === "signup" ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setMessage("");
                    setConfirmPassword("");
                  }}
                  className="font-black text-cyan-300 underline"
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
                    setPassword("");
                  }}
                  className="font-black text-cyan-300 underline"
                >
                  Create one
                </button>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
