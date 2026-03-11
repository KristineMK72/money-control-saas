"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signup" | "login";

export default function SignupPage() {
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("signup");
  const [plan, setPlan] = useState<string>("free");

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
  }, []);

  const planLabel = useMemo(() => {
    if (plan === "monthly") return "$5/month";
    if (plan === "yearly") return "$39/year";
    return "Free";
  }, [plan]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

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
          selected_plan: plan,
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Account created. Check your email for confirmation, then log in."
      );
    }

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
    } else {
      setMessage("Logged in! Opening dashboard...");
      window.location.href = "/dashboard";
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-8 shadow-2xl">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Get started
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>

            <p className="mt-4 max-w-xl text-white/70">
              {mode === "signup"
                ? "Start with a clean financial plan and build calm around what to pay first."
                : "Log in to continue with your bills, forecast, and crisis planning."}
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Selected plan</div>
              <div className="mt-2 text-2xl font-black">{planLabel}</div>
              <div className="mt-2 text-sm text-white/60">
                {plan === "free"
                  ? "You can start free now and upgrade later."
                  : "You selected a paid plan. Billing can be connected next with Stripe."}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
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

          <div className="rounded-[32px] border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
            <h2 className="text-2xl font-black">
              {mode === "signup" ? "Create account" : "Login"}
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              {mode === "signup"
                ? "Use your email and create a password to get started."
                : "Enter your email and password to continue."}
            </p>

            <form
              onSubmit={mode === "signup" ? handleSignup : handleLogin}
              className="mt-6 space-y-4"
            >
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
