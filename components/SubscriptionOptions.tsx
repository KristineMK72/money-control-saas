"use client";

import StripeCheckoutButton from "@/components/StripeCheckoutButton";

type PaidPlan = "monthly" | "yearly";

type SubscriptionOptionsProps = {
  selectedPlan?: string;
  onSelectPlan?: (plan: PaidPlan) => void;
  compact?: boolean;
  className?: string;
};

const plans = [
  {
    id: "monthly" as const,
    label: "Monthly",
    price: "$5",
    suffix: "/month",
    cta: "Choose $5/month",
    href: "/signup?plan=monthly",
    helper: "Full AskBen access with simple month-to-month billing.",
  },
  {
    id: "yearly" as const,
    label: "Yearly",
    price: "$39",
    suffix: "/year",
    cta: "Choose $39/year",
    href: "/signup?plan=yearly",
    helper: "Best value for a full year of planning and bill triage.",
  },
];

export default function SubscriptionOptions({
  selectedPlan,
  onSelectPlan,
  compact = false,
  className = "",
}: SubscriptionOptionsProps) {
  return (
    <div className={className}>
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {plans.map((plan) => {
          const selected = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-4 shadow-xl ${
                selected
                  ? "border-cyan-300 bg-cyan-300/10"
                  : "border-white/20 bg-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                    Pro {plan.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {plan.price}
                    <span className="text-base font-bold text-white/60">
                      {plan.suffix}
                    </span>
                  </p>
                </div>
                {selected ? (
                  <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-zinc-950">
                    Selected
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm font-semibold leading-5 text-white/75">
                {plan.helper}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {onSelectPlan ? (
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan.id)}
                    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15"
                  >
                    Select
                  </button>
                ) : (
                  <a
                    href={plan.href}
                    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15"
                  >
                    Sign up
                  </a>
                )}
                <StripeCheckoutButton
                  plan={plan.id}
                  className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-cyan-200 disabled:opacity-60"
                >
                  {plan.cta}
                </StripeCheckoutButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
