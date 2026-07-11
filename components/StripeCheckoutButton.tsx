"use client";

import { useState } from "react";

type Plan = "monthly" | "yearly";

export default function StripeCheckoutButton({
  plan,
  children,
  className,
}: {
  plan: Plan;
  children: React.ReactNode;
  className: string;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Stripe checkout could not start.");
      }

      window.location.href = data.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Stripe checkout failed.");
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={startCheckout} disabled={loading} className={className}>
      {loading ? "Opening checkout..." : children}
    </button>
  );
}
