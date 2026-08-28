"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { playBell, playCoins } from "@/lib/sounds";

const steps = [
  {
    eyebrow: "Welcome",
    title: "Start with one number",
    icon: "📜",
    text: "AskBen is triage, not a lecture. Add one bill or debt so Ben has something honest to rank. The town unlocks after the ledger speaks.",
    href: "/bills",
    cta: "Open the ledger",
  },
  {
    eyebrow: "Step 2 of 4",
    title: "Let Ben rank it",
    icon: "🪶",
    text: "Due dates and balances beat vibes. Ask Ben what to pay this week. He will give one next move — not a 12-tab sermon.",
    href: "/chat",
    cta: "Ask Ben",
  },
  {
    eyebrow: "Step 3 of 4",
    title: "Log a payment when you make one",
    icon: "🪙",
    text: "A payment is a win. Recording it earns XP and keeps the forecast honest. Skip this until money actually moves.",
    href: "/payments",
    cta: "Payments",
  },
  {
    eyebrow: "Last step",
    title: "Then visit the town",
    icon: "🏦",
    text: "Franklin’s Landing is the celebration layer. Come back when you want the walk, the badges, or a different Ben voice.",
    href: "/world",
    cta: "Peek at the town",
  },
];

export default function OnboardingTour() {
  const supabase = createSupabaseBrowserClient();

  const [open,   setOpen]   = useState(false);
  const [step,   setStep]   = useState(0);
  const [userId, setUserId] = useState("");

  useEffect(() => { void checkTour(); }, []);

  async function checkTour() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data?.onboarding_complete) {
      setOpen(true);
      playBell();
    }
  }

  async function finishTour() {
    if (userId) {
      await supabase
        .from("profiles")
        .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
    playCoins();
    setOpen(false);
  }

  function goNext() {
    playBell();
    setStep(s => s + 1);
  }

  if (!open) return null;

  const current = steps[step];
  const isLast  = step === steps.length - 1;
  const pct     = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
         style={{ background: "rgba(5,2,0,0.85)", backdropFilter: "blur(8px)" }}>

      <div className="w-full max-w-lg rounded-2xl p-7 relative"
           style={{
             background: "rgba(15,8,4,0.97)",
             border: "1px solid rgba(201,168,76,0.5)",
             boxShadow: "0 0 60px rgba(201,168,76,0.15), 0 25px 50px rgba(0,0,0,0.8)",
             fontFamily: "EB Garamond, serif",
           }}>

        {/* Decorative top rule */}
        <div className="h-px w-full mb-5"
             style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />

        {/* Icon */}
        <div className="text-4xl text-center mb-3">{current.icon}</div>

        {/* Eyebrow */}
        <p className="text-center text-[10px] uppercase tracking-[0.25em] font-cinzel font-bold"
           style={{ color: "#6b4423" }}>
          {current.eyebrow}
        </p>

        {/* Title */}
        <h2 className="mt-2 text-center font-cinzel text-3xl font-bold"
            style={{ color: "#c9a84c" }}>
          {current.title}
        </h2>

        {/* Body */}
        <p className="mt-4 text-center text-base leading-7"
           style={{ color: "#9a7d5a" }}>
          {current.text}
        </p>

        {/* XP reward */}
        <div className="mt-5 rounded-xl px-4 py-3 text-center"
             style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}>
          <p className="text-sm font-cinzel font-bold" style={{ color: "#c9a84c" }}>
            ✦ Reward: +50 XP for each first Treasury action
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
                    className="rounded-xl px-5 py-3 text-sm font-cinzel font-bold transition"
                    style={{ background: "rgba(107,68,35,0.2)", border: "1px solid rgba(107,68,35,0.4)",
                             color: "#9a7d5a" }}>
              ← Back
            </button>
          )}

          {!isLast ? (
            <button onClick={goNext}
                    className="rounded-xl px-6 py-3 text-sm font-cinzel font-bold transition"
                    style={{ background: "#c9a84c", color: "#1a0f0a" }}>
              Next →
            </button>
          ) : (
            <button onClick={finishTour}
                    className="rounded-xl px-6 py-3 text-sm font-cinzel font-bold transition"
                    style={{ background: "#c9a84c", color: "#1a0f0a" }}>
              Enter the Colony ✦
            </button>
          )}

          <Link href={current.href} onClick={() => setOpen(false)}
                className="rounded-xl px-5 py-3 text-sm font-cinzel font-bold transition"
                style={{ background: "rgba(45,90,39,0.3)", border: "1px solid rgba(74,138,66,0.5)",
                         color: "#4ade80" }}>
            {current.cta}
          </Link>

          <button onClick={finishTour}
                  className="ml-auto rounded-xl px-5 py-3 text-xs font-cinzel transition"
                  style={{ color: "#6b4423" }}>
            Skip tour
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between mb-1.5">
            {steps.map((_, i) => (
              <div key={i}
                   className="h-1.5 rounded-full transition-all duration-500"
                   style={{
                     flex: 1,
                     marginRight: i < steps.length - 1 ? "4px" : 0,
                     background: i <= step
                       ? "linear-gradient(90deg, #8b6914, #c9a84c)"
                       : "rgba(107,68,35,0.25)",
                   }} />
            ))}
          </div>
          <p className="text-center text-[10px] font-cinzel" style={{ color: "#6b4423" }}>
            Step {step + 1} of {steps.length} &mdash; {pct}% complete
          </p>
        </div>

        {/* Bottom rule */}
        <div className="h-px w-full mt-5"
             style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
      </div>
    </div>
  );
}
