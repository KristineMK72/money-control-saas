"use client";

import { useSearchParams } from "next/navigation";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "monthly";

  const isMonthly = plan === "monthly";

  const handleCheckout = () => {
    window.open(`/api/create-checkout-session?plan=${plan}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-3xl font-bold">Create your account</h1>

      <p className="mt-4 text-white/70">
        You selected:{" "}
        <span className="font-semibold text-cyan-300">
          {isMonthly ? "$5/month" : "$39/year"}
        </span>
      </p>

      <p className="mt-2 text-sm text-white/50">
        {isMonthly ? (
          <>
            Want to save 35%?{" "}
            <a
              href="/signup?plan=yearly"
              className="text-cyan-300 underline hover:text-cyan-200"
            >
              Switch to yearly
            </a>
          </>
        ) : (
          <>
            Prefer monthly?{" "}
            <a
              href="/signup?plan=monthly"
              className="text-cyan-300 underline hover:text-cyan-200"
            >
              Switch to monthly
            </a>
          </>
        )}
      </p>

      <button
        onClick={handleCheckout}
        className="mt-8 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
      >
        Continue to Stripe Checkout
      </button>
    </div>
  );
}
