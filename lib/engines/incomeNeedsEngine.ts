export type IncomeNeedsInput = {
  totalMonthlyBills: number;      // from Bills page Smart Mode
  incomeEntries: { amount: number; date_iso: string }[];
  todayISO: string;               // YYYY-MM-DD
};

export type IncomeNeedsOutput = {
  incomeSoFar: number;
  remainingNeed: number;
  dailyNeed: number;
  weeklyNeed: number;
  monthlyNeed: number;
  surplus: number;
  shortfall: number;
  benMessage: string;
};

export function incomeNeedsEngine(input: IncomeNeedsInput): IncomeNeedsOutput {
  const { totalMonthlyBills, incomeEntries, todayISO } = input;

  const now = new Date(todayISO);
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const daysInMonth = lastOfMonth.getDate();
  const today = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - today);

  const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));

  const incomeSoFar = incomeEntries.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const remainingNeed = Math.max(0, totalMonthlyBills - incomeSoFar);

  const dailyNeed = remainingNeed / daysRemaining;
  const weeklyNeed = remainingNeed / weeksRemaining;
  const monthlyNeed = totalMonthlyBills;

  const surplus = Math.max(0, incomeSoFar - totalMonthlyBills);
  const shortfall = Math.max(0, totalMonthlyBills - incomeSoFar);

  const benMessage = generateBenMessage({
    dailyNeed,
    weeklyNeed,
    remainingNeed,
    surplus,
    shortfall,
  });

  return {
    incomeSoFar,
    remainingNeed,
    dailyNeed,
    weeklyNeed,
    monthlyNeed,
    surplus,
    shortfall,
    benMessage,
  };
}

function generateBenMessage({
  dailyNeed,
  weeklyNeed,
  remainingNeed,
  surplus,
  shortfall,
}: {
  dailyNeed: number;
  weeklyNeed: number;
  remainingNeed: number;
  surplus: number;
  shortfall: number;
}) {
  if (surplus > 0) {
    return `You’re ahead by $${surplus.toFixed(
      0
    )}. Today’s need is $0 — protect that win.`;
  }

  if (shortfall > 0 && dailyNeed < 10) {
    return `You’re close. Today’s target is just $${dailyNeed.toFixed(
      0
    )}. One small push and you’re back on track.`;
  }

  if (shortfall > 0 && dailyNeed >= 10 && dailyNeed <= 40) {
    return `Today’s need is $${dailyNeed.toFixed(
      0
    )}. Manageable. Let’s chip away at it.`;
  }

  if (dailyNeed > 40) {
    return `Today’s need is $${dailyNeed.toFixed(
      0
    )}. It’s a big day, but not impossible — one step at a time.`;
  }

  return `You’re steady. Keep the rhythm going.`;
}
