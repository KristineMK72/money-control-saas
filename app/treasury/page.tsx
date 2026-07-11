"use client";

import { useMemo, useState } from "react";

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function num(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function TreasuryPage() {
  const [savingsTotal, setSavingsTotal] = useState("0");
  const [emergencyGoal, setEmergencyGoal] = useState("1000");
  const [investmentTotal, setInvestmentTotal] = useState("0");
  const [startingDebt, setStartingDebt] = useState("0");
  const [currentDebt, setCurrentDebt] = useState("0");
  const [creditUsed, setCreditUsed] = useState("0");
  const [creditLimit, setCreditLimit] = useState("0");
  const [monthlyLeftover, setMonthlyLeftover] = useState("0");

  const stats = useMemo(() => {
    const savings = num(savingsTotal);
    const emergency = num(emergencyGoal);
    const investments = num(investmentTotal);
    const startDebt = num(startingDebt);
    const debt = num(currentDebt);
    const used = num(creditUsed);
    const limit = num(creditLimit);
    const leftover = num(monthlyLeftover);

    const debtPaid = Math.max(0, startDebt - debt);
    const netWorth = savings + investments - debt;
    const emergencyPct = emergency > 0 ? (savings / emergency) * 100 : 0;
    const creditUsage = limit > 0 ? (used / limit) * 100 : null;

    return {
      savings,
      emergency,
      investments,
      startDebt,
      debt,
      used,
      limit,
      leftover,
      debtPaid,
      netWorth,
      emergencyPct,
      creditUsage,
    };
  }, [
    savingsTotal,
    emergencyGoal,
    investmentTotal,
    startingDebt,
    currentDebt,
    creditUsed,
    creditLimit,
    monthlyLeftover,
  ]);

  const goals = [
    {
      title: "First Coin Saved",
      desc: "Save your first $25.",
      current: stats.savings,
      target: 25,
      xp: 50,
      icon: "🪙",
    },
    {
      title: "Emergency Spark",
      desc: "Build a $100 starter cushion.",
      current: stats.savings,
      target: 100,
      xp: 100,
      icon: "🔥",
    },
    {
      title: "Storm Fund",
      desc: "Reach $500 in savings.",
      current: stats.savings,
      target: 500,
      xp: 250,
      icon: "⛈️",
    },
    {
      title: "Treasury Fortress",
      desc: "Reach $1,000 in savings.",
      current: stats.savings,
      target: 1000,
      xp: 500,
      icon: "🏰",
    },
    {
      title: "First Investment",
      desc: "Log your first investment dollars.",
      current: stats.investments,
      target: 25,
      xp: 150,
      icon: "🌱",
    },
    {
      title: "Wealth Seedling",
      desc: "Reach $100 in investments.",
      current: stats.investments,
      target: 100,
      xp: 250,
      icon: "🌿",
    },
    {
      title: "Debt Dragon Scratch",
      desc: "Pay down $100 of debt.",
      current: stats.debtPaid,
      target: 100,
      xp: 100,
      icon: "🐉",
    },
    {
      title: "Debt Dragon Slayer",
      desc: "Pay down $1,000 of debt.",
      current: stats.debtPaid,
      target: 1000,
      xp: 500,
      icon: "⚔️",
    },
    {
      title: "Positive Coin Flow",
      desc: "End the month with money left over.",
      current: stats.leftover > 0 ? 1 : 0,
      target: 1,
      xp: 150,
      icon: "🌞",
      display: stats.leftover > 0 ? "Achieved" : money(stats.leftover),
    },
    {
      title: "Credit Under 50%",
      desc: "Lower credit usage below 50%.",
      current:
        stats.creditUsage !== null && stats.creditUsage <= 50 ? 1 : 0,
      target: 1,
      xp: 250,
      icon: "📉",
      display:
        stats.creditUsage === null ? "No limit data" : pct(stats.creditUsage),
    },
    {
      title: "Credit Under 30%",
      desc: "Lower credit usage below 30%.",
      current:
        stats.creditUsage !== null && stats.creditUsage <= 30 ? 1 : 0,
      target: 1,
      xp: 500,
      icon: "👑",
      display:
        stats.creditUsage === null ? "No limit data" : pct(stats.creditUsage),
    },
    {
      title: "Positive Net Worth",
      desc: "Make thy net worth rise above zero.",
      current: stats.netWorth > 0 ? 1 : 0,
      target: 1,
      xp: 750,
      icon: "🏆",
      display: money(stats.netWorth),
    },
  ];

  return (
    <main className="min-h-screen bg-transparent p-4 pb-24 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/20 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-yellow-300">
            AskBen Treasury Hall
          </p>
          <h1 className="mt-2 text-4xl font-black md:text-6xl">
            Savings, Wealth & Investments
          </h1>
          <p className="mt-3 max-w-3xl text-white/75">
            Rebuild thy treasury, good friend. Track savings, investments,
            emergency funds, credit usage, debt reduction, and wealth milestones.
          </p>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Savings" value={money(stats.savings)} />
          <StatCard label="Investments" value={money(stats.investments)} />
          <StatCard label="Debt Paid Down" value={money(stats.debtPaid)} />
          <StatCard label="Net Worth" value={money(stats.netWorth)} />
        </section>

        <section className="mb-6 rounded-3xl border border-white/20 bg-black/50 p-5 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-4 text-2xl font-black">Update Thy Treasury</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <MoneyInput
              label="Savings Total"
              value={savingsTotal}
              onChange={setSavingsTotal}
            />
            <MoneyInput
              label="Emergency Fund Goal"
              value={emergencyGoal}
              onChange={setEmergencyGoal}
            />
            <MoneyInput
              label="Investment Total"
              value={investmentTotal}
              onChange={setInvestmentTotal}
            />
            <MoneyInput
              label="Monthly Leftover"
              value={monthlyLeftover}
              onChange={setMonthlyLeftover}
            />
            <MoneyInput
              label="Starting Debt Total"
              value={startingDebt}
              onChange={setStartingDebt}
            />
            <MoneyInput
              label="Current Debt Total"
              value={currentDebt}
              onChange={setCurrentDebt}
            />
            <MoneyInput
              label="Credit Used"
              value={creditUsed}
              onChange={setCreditUsed}
            />
            <MoneyInput
              label="Credit Limit"
              value={creditLimit}
              onChange={setCreditLimit}
            />
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-white/20 bg-black/50 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">
                Emergency Fund
              </p>
              <h2 className="text-2xl font-black">Storm Shield Progress</h2>
            </div>
            <p className="text-xl font-black text-yellow-300">
              {Math.min(100, Math.round(stats.emergencyPct))}%
            </p>
          </div>

          <div className="h-5 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full bg-yellow-300"
              style={{ width: `${Math.min(100, stats.emergencyPct)}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-white/70">
            {money(stats.savings)} saved toward {money(stats.emergency)}.
          </p>
        </section>

        <section className="rounded-3xl border border-white/20 bg-black/50 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">
              Level Up Goals
            </p>
            <h2 className="text-3xl font-black">Badges & Wealth Milestones</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
              const done = goal.current >= goal.target;
              const progress = Math.min(100, (goal.current / goal.target) * 100);

              return (
                <div
                  key={goal.title}
                  className={`rounded-2xl border p-4 shadow-xl ${
                    done
                      ? "border-yellow-300 bg-yellow-300/15"
                      : "border-white/15 bg-white/10"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl">{goal.icon}</div>
                      <h3 className="mt-2 text-lg font-black">{goal.title}</h3>
                      <p className="text-sm text-white/70">{goal.desc}</p>
                    </div>

                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-yellow-200">
                      +{goal.xp} XP
                    </div>
                  </div>

                  <div className="mb-2 flex justify-between text-xs font-bold text-white/75">
                    <span>{goal.display ?? money(goal.current)}</span>
                    <span>{done ? "Complete" : money(goal.target)}</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-yellow-300"
                      style={{ width: `${done ? 100 : progress}%` }}
                    />
                  </div>

                  {done && (
                    <p className="mt-3 text-sm font-black text-yellow-200">
                      Badge earned!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/20 bg-black/50 p-5 shadow-xl backdrop-blur-xl">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-yellow-300">{value}</p>
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white/75">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/20 bg-white/95 px-4 py-3 font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-yellow-300"
      />
    </label>
  );
}
