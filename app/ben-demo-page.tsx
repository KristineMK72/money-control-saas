"use client";

/**
 * Demo page — shows Ben, the Town Crier parchment, and a letter in action.
 * Drop this into app/ben-demo/page.tsx (or similar) in your Next.js app.
 */

import { useState } from "react";
import { Ben as BenBrain } from "@/lib/ben";
import type { FinancialSnapshot } from "@/lib/ben";
import { Ben } from "@/components/Ben";
import { BenLetter } from "@/components/BenLetter";
import { TownCrier } from "@/components/TownCrier";

const SAMPLE: FinancialSnapshot = {
  incomeThisMonth: 1847,
  remainingIncome: 312,
  billsDueCount: 2,
  daysUntilNextBill: 3,
  totalDebt: 4200,
  debtChange: -150,
  savings: 890,
  savingsProgress: 0.72,
  risingExpenses: ["dining", "subscriptions"],
  idleSubscriptions: 3,
  usualPayday: "Fridays",
  overdueAmount: 0,
};

export default function BenDemoPage() {
  const [showParchment, setShowParchment] = useState(true);
  const [showLetter, setShowLetter] = useState(false);

  const parchment = BenBrain.announceArrival(SAMPLE);
  const letter = BenBrain.writeLetter({
    type: "billReminder",
    billName: "electric account",
    daysUntilDue: 2,
    data: SAMPLE,
  });
  const patternSpeech = BenBrain.speak({
    context: "spendingPattern",
    data: SAMPLE,
    location: "Dashboard",
  });
  const rep = BenBrain.reputation(SAMPLE);

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="text-center">
          <h1 className="font-serif text-3xl font-bold text-amber-100">
            Franklin&apos;s Landing
          </h1>
          <p className="mt-1 text-sm text-stone-400">Ben character system demo</p>
        </header>

        {/* Arrival parchment */}
        {showParchment && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
              App open — Town Crier
            </h2>
            <TownCrier
              announcement={parchment}
              onAction={(href) => {
                console.log("Navigate to", href);
                setShowParchment(false);
              }}
              onDismiss={() => setShowParchment(false)}
            />
          </section>
        )}

        {/* Inline Ben bubble */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
            Dashboard greeting
          </h2>
          <Ben context="greeting" location="TownSquare" data={SAMPLE} />
        </section>

        {/* Pattern awareness */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
            Pattern insight
          </h2>
          <Ben
            speech={patternSpeech.text}
            mood={patternSpeech.mood}
            location="Dashboard"
            animation={patternSpeech.animation}
          />
        </section>

        {/* Reputation */}
        <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-500">
            Reputation
          </h2>
          <p className="font-serif text-lg text-amber-100">
            {rep.label}{" "}
            <span className="text-sm text-stone-400">({rep.score}/100)</span>
          </p>
          <p className="mt-1 text-sm text-stone-400">{rep.description}</p>
        </section>

        {/* Letter trigger */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
            Colonial letter
          </h2>
          {!showLetter ? (
            <button
              type="button"
              onClick={() => setShowLetter(true)}
              className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 font-serif text-amber-100 transition hover:bg-amber-900/40"
            >
              📜 A letter has arrived
            </button>
          ) : (
            <BenLetter
              letter={letter}
              onOpen={() => console.log("Open Payment Hall")}
              onDismiss={() => setShowLetter(false)}
            />
          )}
        </section>

        {/* Location variants */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Same Ben, different locations
          </h2>
          <Ben context="greeting" location="Bank" data={SAMPLE} size="sm" />
          <Ben context="greeting" location="PaymentHall" data={SAMPLE} size="sm" />
          <Ben context="debtUpdate" location="GovernorsOffice" data={SAMPLE} size="sm" />
        </section>
      </div>
    </main>
  );
}
