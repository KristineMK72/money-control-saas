/**
 * Example: wire colonial charts + Ben on a dashboard section.
 *
 * npm i d3
 * npm i -D @types/d3
 */

"use client";

import { Ben as BenBrain } from "@/lib/ben";
import type { FinancialSnapshot } from "@/lib/ben";
import { Ben } from "@/components/Ben";
import { SavingsStrongbox, DebtWall } from "@/components/charts";

const data: FinancialSnapshot = {
  savings: 890,
  savingsProgress: 0.72,
  totalDebt: 4200,
  debtChange: -150,
};

export function DashboardChartsSection() {
  const debtSpeech = BenBrain.speak({
    context: "debtUpdate",
    data,
    location: "Dashboard",
  });

  const savingsSpeech = BenBrain.speak({
    context: "savingsMilestone",
    data,
    location: "Dashboard",
  });

  return (
    <section className="grid gap-8 md:grid-cols-2">
      {/* Savings strongbox */}
      <div className="rounded-xl border border-amber-900/40 bg-stone-950 p-5">
        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-widest text-amber-200/80">
          The Strongbox
        </h3>
        <SavingsStrongbox
          progress={data.savingsProgress ?? 0}
          savings={data.savings}
          goal={Math.round((data.savings ?? 0) / (data.savingsProgress || 1))}
        />
        <div className="mt-4">
          <Ben
            speech={savingsSpeech.text}
            mood={savingsSpeech.mood}
            animation={savingsSpeech.animation}
            location="Dashboard"
            size="sm"
          />
        </div>
      </div>

      {/* Debt wall */}
      <div className="rounded-xl border border-stone-800 bg-stone-950 p-5">
        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-widest text-stone-400">
          The Wall of Obligations
        </h3>
        <DebtWall
          segments={[
            { label: "Card", amount: 1400 },
            { label: "Loan", amount: 2800 },
          ]}
          debtChange={data.debtChange}
        />
        <div className="mt-4">
          <Ben
            speech={debtSpeech.text}
            mood={debtSpeech.mood}
            animation={debtSpeech.animation}
            location="Dashboard"
            size="sm"
          />
        </div>
      </div>
    </section>
  );
}
