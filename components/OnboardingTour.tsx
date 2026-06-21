"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const steps = [
  {
    eyebrow: "Welcome Governor",
    title: "Welcome to AskBen",
    text: "AskBen helps you rebuild your Treasury one small win at a time. Track bills, debts, income, spending, and payments without shame.",
    href: "/dashboard",
    cta: "Begin Tour",
  },
  {
    eyebrow: "Step 1",
    title: "Add your first debt",
    text: "Debts are part of your Treasury map. Add one debt so Ben can help you understand what needs attention.",
    href: "/debt",
    cta: "Go to Debt",
  },
  {
    eyebrow: "Step 2",
    title: "Add your first bill",
    text: "Bills help Ben see what is urgent, what can wait, and what needs a plan.",
    href: "/bills",
    cta: "Go to Bills",
  },
  {
    eyebrow: "Step 3",
    title: "Record a payment",
    text: "Every payment is a victory. Logging payments helps rebuild your Treasury and track real progress.",
    href: "/payments",
    cta: "Go to Payments",
  },
  {
    eyebrow: "Step 4",
    title: "Meet Ben",
    text: "Ben gives calm guidance, priorities, encouragement, and next steps when money feels overwhelming.",
    href: "/chat",
    cta: "Ask Ben",
  },
  {
    eyebrow: "Final Step",
    title: "Customize your Governor Profile",
    text: "Choose Ben’s voice, manage settings, check XP, and adjust your experience.",
    href: "/settings",
    cta: "Open Settings",
  },
];

export default function OnboardingTour() {
  const supabase = createSupabaseBrowserClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    checkTour();
  }, []);

  async function checkTour() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();

    if (!data?.onboarding_complete) {
      setOpen(true);
    }
  }

  async function finishTour() {
    if (userId) {
      await supabase
        .from("profiles")
        .update({
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    setOpen(false);
  }

  if (!open) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-[2rem] border border-cyan-300/25 bg-slate-950 p-7 text-white shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
          {current.eyebrow}
        </p>

        <h2 className="mt-3 text-4xl font-black">{current.title}</h2>

        <p className="mt-4 text-base font-semibold leading-7 text-white/75">
          {current.text}
        </p>

        <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
          <p className="text-sm font-black text-yellow-100">
            Reward: +50 XP for each first Treasury action.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-black text-white"
            >
              Back
            </button>
          ) : null}

          {!isLast ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black"
            >
              Next
            </button>
          ) : (
            <button
              onClick={finishTour}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black"
            >
              Finish Tour
            </button>
          )}

          <Link
            href={current.href}
            onClick={() => setOpen(false)}
            className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-3 font-black text-yellow-100"
          >
            {current.cta}
          </Link>

          <button
            onClick={finishTour}
            className="ml-auto rounded-xl px-5 py-3 font-black text-white/60"
          >
            Skip
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={
                i === step
                  ? "h-2 flex-1 rounded-full bg-cyan-300"
                  : "h-2 flex-1 rounded-full bg-white/15"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
