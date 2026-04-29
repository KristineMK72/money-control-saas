"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function SignupForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCheckout = () => {
    if (!plan) return;
    window.open(`/api/create-checkout-session?plan=${plan}`, "_blank");
  };

  const handleFreeSignup = async () => {
    // your Supabase signup logic here
  };

  // If a plan is selected → show Stripe checkout
  if (plan === "monthly" || plan === "yearly") {
    const isMonthly = plan === "monthly";

    return (
      <div className="min-h-screen bg-zinc-950 text-white p-10">
        <h1 className="text-3xl font-bold">Upgrade to Premium</h1>

        <p className="mt-4 text-white/70">
          You selected:{" "}
          <span className="font-semibold text-cyan-300">
            {isMonthly ? "$5/month" : "$39/year"}
          </span>
        </p>

        <button
          onClick={handleCheckout}
          className="mt-8 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
        >
          Continue to Stripe Checkout
        </button>

        <p className="mt-4 text-sm text-white/50">
          Want the free version?{" "}
          <a href="/signup" className="text-cyan-300 underline">
            Create a free account instead
          </a>
        </p>
      </div>
    );
  }

  // Default → FREE SIGNUP
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-3xl font-bold">Create your free account</h1>

      <input
        type="email"
        placeholder="Email"
        className="mt-6 w-full rounded-lg bg-white/10 p-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="mt-3 w-full rounded-lg bg-white/10 p-3"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleFreeSignup}
        className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
      >
        Create Free Account
      </button>

      <p className="mt-4 text-sm text-white/50">
        Want Premium?{" "}
        <a href="/signup?plan=monthly" className="text-cyan-300 underline">
          Upgrade for $5/month
        </a>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-white p-10">
          Loading…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
