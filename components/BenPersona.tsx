"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const LOGGED_OUT_QUOTES: Record<string, string[]> = {
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
    "Ben says: Let’s make your money less mysterious.",
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

function buildLoggedInQuotes(name: string): Record<string, string[]> {
  return {
    "/dashboard": [
      `Ben says: Welcome back, ${name}. Let’s see what the money is doing today.`,
      `Ben says: ${name}, priorities first. Panic is not a payment method.`,
      `Ben says: ${name}, we are not guessing. We are managing.`,
      `Ben says: ${name}, you do not need perfection. You need the next right move.`,
      `Ben says: ${name}, financial peace is built one awkward click at a time.`,
      `Ben says: ${name}, calm beats chaos every single time.`,
    ],
    "/forecast": [
      `Ben says: ${name}, the future is less scary when it has numbers on it.`,
      `Ben says: ${name}, forecast first and freak out less later.`,
      `Ben says: ${name}, this is where hope meets math.`,
      `Ben says: ${name}, if the numbers look rude, we fix the numbers.`,
      `Ben says: ${name}, let’s make your money less mysterious.`,
    ],
    "/bills": [
      `Ben says: ${name}, bills love attention. Give it strategically.`,
      `Ben says: ${name}, one bill at a time still counts as progress.`,
      `Ben says: ${name}, the budget is not mad. It’s just disappointed.`,
      `Ben says: ${name}, due dates are just calendar drama with consequences.`,
      `Ben says: ${name}, ignore less. Stress less.`,
    ],
    "/debt": [
      `Ben says: ${name}, debt is loud, but we can be louder.`,
      `Ben says: ${name}, minimums matter. Strategy matters more.`,
      `Ben says: ${name}, we’re not here to admire the debt. We’re here to reduce it.`,
      `Ben says: ${name}, interest is a clingy little goblin.`,
      `Ben says: ${name}, let’s make the debt smaller and your peace bigger.`,
    ],
    "/spend": [
      `Ben says: ${name}, receipts are just gossip for your bank account.`,
      `Ben says: ${name}, spending amnesia is expensive.`,
      `Ben says: ${name}, let’s make your money less mysterious.`,
      `Ben says: ${name}, awareness is cheaper than regret.`,
      `Ben says: ${name}, every swipe tells a story. Some of them are messy.`,
    ],
    "/income": [
      `Ben says: ${name}, money in deserves a plan too.`,
      `Ben says: ${name}, every dollar needs a job before it wanders off.`,
      `Ben says: ${name}, earn it, name it, aim it.`,
      `Ben says: ${name}, income is step one. Direction is step two.`,
      `Ben says: ${name}, we are not guessing. We are managing.`,
    ],
    "/payments": [
      `Ben says: ${name}, one payment is still momentum.`,
      `Ben says: ${name}, paying things down is its own kind of peace.`,
      `Ben says: ${name}, this is where chaos starts losing.`,
      `Ben says: ${name}, progress looks sexy in transaction form.`,
    ],
    "/calendar": [
      `Ben says: ${name}, your calendar is trying to help you.`,
      `Ben says: ${name}, future-you loves a good due-date map.`,
      `Ben says: ${name}, if it’s on the calendar, it’s harder to forget on purpose.`,
      `Ben says: ${name}, dates matter. Vibes do not.`,
      `Ben says: ${name}, the calendar knows who’s about to get paid first.`,
    ],
    "/crisis": [
      `Ben says: ${name}, we are triaging, not spiraling.`,
      `Ben says: ${name}, breathe first. Then pay the most important thing.`,
      `Ben says: ${name}, survival mode still gets a plan.`,
      `Ben says: ${name}, debt is loud, but we can be louder.`,
      `Ben says: ${name}, we do not panic-buy stress around here.`,
    ],
    "/signup": [
      `Ben says: Welcome back, ${name}.`,
      `Ben says: ${name}, let’s make your money less mysterious.`,
      `Ben says: ${name}, you bring the honesty. I’ll bring the sarcasm.`,
      `Ben says: ${name}, new account, new energy.`,
    ],
  };
}

function pickQuote(pathname: string, options: string[]) {
  const seed = pathname.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return options[seed % options.length];
}

export default function BenPersona() {
  const supabase = createSupabaseBrowserClient();
  const pathname = usePathname();

  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadName() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (data?.display_name) {
        setName(data.display_name);
      }

      setLoaded(true);
    }

    loadName();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const quote = useMemo(() => {
    const quoteMap = name ? buildLoggedInQuotes(name) : LOGGED_OUT_QUOTES;

    const options =
      quoteMap[pathname] || [
        name
          ? `Ben says: ${name}, financial peace is built one awkward click at a time.`
          : "Ben says: Financial peace is built one awkward click at a time.",
        name
          ? `Ben says: ${name}, let’s keep this smart, simple, and slightly petty toward debt.`
          : "Ben says: Let’s keep this smart, simple, and slightly petty toward debt.",
        name
          ? `Ben says: ${name}, debt is loud, but we can be louder.`
          : "Ben says: Debt is loud, but we can be louder.",
        name
          ? `Ben says: ${name}, receipts are just gossip for your bank account.`
          : "Ben says: Receipts are just gossip for your bank account.",
        name
          ? `Ben says: ${name}, the budget is not mad. It’s just disappointed.`
          : "Ben says: The budget is not mad. It’s just disappointed.",
      ];

    return pickQuote(pathname, options);
  }, [pathname, name]);

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #08141c 0%, #071018 45%, #0b2017 100%)",
        borderTop: "1px solid rgba(16,185,129,0.18)",
        borderBottom: "1px solid rgba(16,185,129,0.18)",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            overflow: "hidden",
            background: "#08111a",
            border: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <img
            src="/ben.png"
            alt="AskBen mascot"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(110,231,183,0.9)",
            }}
          >
            AskBen
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#ffffff",
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            {loaded ? quote : "Ben says: Let’s get your money less chaotic."}
          </div>
        </div>
      </div>
    </div>
  );
}
