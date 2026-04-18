"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start checkout");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: any) {
      console.error(e);
      setError("Couldn’t start checkout. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Unlock AskBen Premium
          </h1>
          <p className="text-sm text-zinc-400">
            Ben will forecast your next 90 days, prioritize payments, and show you how to save on interest.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3 text-sm">
          <div className="font-semibold text-zinc-200">
            What you get:
          </div>
          <ul className="list-disc list-inside space-y-1 text-zinc-300">
            <li>90‑day cashflow forecast</li>
            <li>Debt payoff timeline and interest saved</li>
            <li>Smart‑Mode with APR‑aware recommendations</li>
            <li>Ben’s premium coaching tuned to your profile</li>
          </ul>
          <div className="text-xs text-zinc-500">
            Cancel anytime. No hidden fees.
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading ? "Redirecting to Stripe…" : "Upgrade with Stripe"}
        </button>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full text-xs text-zinc-500 hover:text-zinc-300"
        >
          Maybe later — take me back
        </button>
      </div>
    </main>
  );
}
