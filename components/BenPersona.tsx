"use client";

import Image from "next/image";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

const QUOTES: Record<string, string[]> = {
  "/dashboard": [
    "Ben says: Calm beats chaos every single time.",
    "Ben says: Priorities first. Panic is not a payment method.",
    "Ben says: Let’s handle the money before the money handles you.",
    "Ben says: You do not need perfection. You need the next right move.",
    "Ben says: We are not guessing. We are managing.",
    "Ben says: Financial peace is built one awkward click at a time.",
  ],
  "/forecast": [
    "Ben says: The future is less scary when it has numbers on it.",
    "Ben says: Forecast now, freak out less later.",
    "Ben says: This is where hope meets math.",
    "Ben says: If the numbers look rude, we fix the numbers.",
    "Ben says: Let’s make your money less mysterious.",
  ],
  "/bills": [
    "Ben says: Bills love attention. Give it strategically.",
    "Ben says: Due dates are just calendar drama with consequences.",
    "Ben says: One bill at a time still counts as progress.",
    "Ben says: Ignore less. Stress less.",
    "Ben says: The budget is not mad. It’s just disappointed.",
  ],
  "/debt": [
    "Ben says: Debt gets louder when you avoid it.",
    "Ben says: Minimums matter. Strategy matters more.",
    "Ben says: Interest is a clingy little goblin.",
    "Ben says: We’re not here to admire the debt. We’re here to reduce it.",
    "Ben says: Debt is loud, but we can be louder.",
  ],
  "/spend": [
    "Ben says: Tiny purchases still know how to team up against you.",
    "Ben says: Awareness is cheaper than regret.",
    "Ben says: Every swipe tells a story. Some of them are messy.",
    "Ben says: Let’s make your spending less mysterious.",
    "Ben says: Receipts are just gossip for your bank account.",
    "Ben says: Spending amnesia is expensive.",
  ],
  "/income": [
    "Ben says: Money in deserves a plan too.",
    "Ben says: Every dollar needs a job before it wanders off.",
    "Ben says: Income is step one. Direction is step two.",
    "Ben says: Earn it, name it, aim it.",
    "Ben says: We are not guessing. We are managing.",
  ],
  "/payments": [
    "Ben says: Paying things down is its own kind of peace.",
    "Ben says: Progress looks sexy in transaction form.",
    "Ben says: One payment is still momentum.",
    "Ben says: This is where chaos starts losing.",
  ],
  "/calendar": [
    "Ben says: Future-you loves a good due-date map.",
    "Ben says: The calendar knows who’s about to get paid first.",
    "Ben says: Dates matter. Vibes do not.",
    "Ben says: If it’s on the calendar, it’s harder to forget on purpose.",
    "Ben says: Your calendar is trying to help you.",
  ],
  "/crisis": [
    "Ben says: We are triaging, not spiraling.",
    "Ben says: Breathe first. Then pay the most important thing.",
    "Ben says: Survival mode still gets a plan.",
    "Ben says: We do not panic-buy stress around here.",
    "Ben says: Debt is loud, but we can be louder.",
  ],
  "/signup": [
    "Ben says: Welcome in. Let’s make your money less chaotic.",
    "Ben says: This is a judgment-free financial zone.",
    "Ben says: New account, new energy.",
    "Ben says: You bring the honesty. I’ll bring the sarcasm.",
  ],
};

function getQuote(pathname: string) {
  const options = QUOTES[pathname] || [
    "Ben says: Small steps still count, especially the boring ones.",
    "Ben says: Money behaves better when you look at it.",
    "Ben says: Let’s keep this smart, simple, and slightly petty toward debt.",
    "Ben says: Debt is loud, but we can be louder.",
    "Ben says: Receipts are just gossip for your bank account.",
    "Ben says: Let’s make your money less mysterious.",
    "Ben says: The budget is not mad. It’s just disappointed.",
    "Ben says: We are not guessing. We are managing.",
    "Ben says: Your calendar is trying to help you.",
    "Ben says: Spending amnesia is expensive.",
    "Ben says: Financial peace is built one awkward click at a time.",
  ];

  const seed = pathname
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  return options[seed % options.length];
}

export default function BenPersona() {
  const pathname = usePathname();
  const quote = useMemo(() => getQuote(pathname), [pathname]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-r from-[#08141c] via-[#071018] to-[#0b2017] p-4 md:p-5">
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black/20 md:h-24 md:w-24">
            <Image
              src="/ben-head.png"
              alt="AskBen mascot"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300/85">
            AskBen
          </div>
          <div className="mt-1 text-sm leading-6 text-white md:text-base">
            {quote}
          </div>
        </div>
      </div>
    </div>
  );
}
