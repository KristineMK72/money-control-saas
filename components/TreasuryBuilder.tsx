"use client";

type TreasuryBuilderProps = {
  savingsTotal: number;
  debtTotal: number;
  startingDebtTotal?: number;
  creditUsed?: number;
  creditLimit?: number;
  monthlyLeftover?: number;
};

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

export default function TreasuryBuilder({
  savingsTotal,
  debtTotal,
  startingDebtTotal = debtTotal,
  creditUsed = 0,
  creditLimit = 0,
  monthlyLeftover = 0,
}: TreasuryBuilderProps) {
  const debtPaid = Math.max(0, startingDebtTotal - debtTotal);
  const creditUsage = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : null;

  const goals = [
    {
      title: "First Coin Saved",
      desc: "Save your first $25.",
      current: savingsTotal,
      target: 25,
      xp: 50,
      icon: "🪙",
    },
    {
      title: "Emergency Spark",
      desc: "Build a $100 starter cushion.",
      current: savingsTotal,
      target: 100,
      xp: 100,
      icon: "🔥",
    },
    {
      title: "Storm Fund",
      desc: "Reach $500 in savings.",
      current: savingsTotal,
      target: 500,
      xp: 250,
      icon: "⛈️",
    },
    {
      title: "Treasury Fortress",
      desc: "Reach $1,000 in savings.",
      current: savingsTotal,
      target: 1000,
      xp: 500,
      icon: "🏰",
    },
    {
      title: "Debt Dragon Scratch",
      desc: "Pay down $100 of debt.",
      current: debtPaid,
      target: 100,
      xp: 100,
      icon: "🐉",
    },
    {
      title: "Debt Dragon Slayer",
      desc: "Pay down $1,000 of debt.",
      current: debtPaid,
      target: 1000,
      xp: 500,
      icon: "⚔️",
    },
    {
      title: "Positive Coin Flow",
      desc: "End the month with money left over.",
      current: monthlyLeftover > 0 ? 1 : 0,
      target: 1,
      xp: 150,
      icon: "🌱",
      display: monthlyLeftover > 0 ? "Achieved" : money(monthlyLeftover),
    },
    {
      title: "Credit Under 50%",
      desc: "Lower credit usage below 50%.",
      current: creditUsage !== null && creditUsage <= 50 ? 1 : 0,
      target: 1,
      xp: 250,
      icon: "📉",
      display: creditUsage === null ? "No limit data" : pct(creditUsage),
    },
    {
      title: "Credit Under 30%",
      desc: "Lower credit usage below 30%.",
      current: creditUsage !== null && creditUsage <= 30 ? 1 : 0,
      target: 1,
      xp: 500,
      icon: "👑",
      display: creditUsage === null ? "No limit data" : pct(creditUsage),
    },
  ];

  return (
    <section className="rounded-3xl border border-white/20 bg-black/50 p-5 text-white shadow-2xl backdrop-blur-xl">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">
          Treasury Builder
        </p>
        <h2 className="text-3xl font-black">Savings & Wealth Milestones</h2>
        <p className="mt-2 text-sm text-white/70">
          Rebuild thy treasury one victory at a time.
        </p>
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
  );
}
