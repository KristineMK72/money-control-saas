// lib/ben/engine.ts

export type BenMood =
  | "encouraging"
  | "stern"
  | "witty"
  | "urgent"
  | "celebratory";

export type BenMessage = {
  text: string;
  mood: BenMood;
};

type DashboardContext = {
  name?: string;
  income: number;
  spending: number;
  debtTotal: number;
  net: number;
};

type DebtContext = {
  name?: string;
  totalDebt: number;
  minDueThisMonth: number;
  pastDueCount: number;
};

type ForecastContext = {
  name?: string;
  timeframeLabel: string; // "Today" | "This Week" | "This Month"
  totalNeeded: number;
  incomeSoFar: number;
  incomeGap: number;
  dailyIncomeNeeded: number;
};

type CrisisContext = {
  name?: string;
  urgentBillsCount: number;
  urgentDebtCount: number;
  totalUrgentAmount: number;
};

type DailyInsightContext = {
  name?: string;
  incomeToday: number;
  spendingToday: number;
};

type WeeklySummaryContext = {
  name?: string;
  incomeWeek: number;
  spendingWeek: number;
  debtPaidWeek: number;
};

const DEFAULT_NAME = "Kris";

/* ---------------- helpers ---------------- */

function withName(name?: string) {
  return name || DEFAULT_NAME;
}

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

/* ---------------- core quote builders ---------------- */

function buildIncomeGapLine(
  name: string,
  gap: number,
  timeframeLabel: string,
  dailyNeed: number
): BenMessage {
  if (gap <= 0) {
    return {
      mood: "celebratory",
      text: `${name}, industry and patience have served you well. You have met the needs of ${timeframeLabel.toLowerCase()} already.`,
    };
  }

  if (gap < 50) {
    return {
      mood: "encouraging",
      text: `${name}, a small leak will sink a great ship. Today’s leak is ${formatUSD(
        gap
      )} for ${timeframeLabel.toLowerCase()} — let us mend it with steady effort of about ${formatUSD(
        dailyNeed
      )} per day.`,
    };
  }

  if (gap < 200) {
    return {
      mood: "stern",
      text: `${name}, beware little expenses and idle hours. You are short ${formatUSD(
        gap
      )} for ${timeframeLabel.toLowerCase()}; earn about ${formatUSD(
        dailyNeed
      )} per day and you shall keep your ship afloat.`,
    };
  }

  return {
    mood: "urgent",
    text: `${name}, trouble has knocked upon the door. You are behind by ${formatUSD(
      gap
    )} for ${timeframeLabel.toLowerCase()}. Let us treat each day as precious and aim for about ${formatUSD(
      dailyNeed
    )} in income until the danger has passed.`,
  };
}

function buildDebtLine(
  name: string,
  totalDebt: number,
  minDue: number,
  pastDueCount: number
): BenMessage {
  if (totalDebt <= 0) {
    return {
      mood: "celebratory",
      text: `${name}, you stand free of debt. Guard this liberty well; it is easier kept than regained.`,
    };
  }

  if (pastDueCount > 0) {
    return {
      mood: "urgent",
      text: `${name}, creditors have better memories than debtors. You have ${pastDueCount} past-due account${
        pastDueCount > 1 ? "s" : ""
      }; let us bring them current before interest grows like weeds in an untended garden.`,
    };
  }

  if (minDue > 0 && totalDebt > minDue * 10) {
    return {
      mood: "stern",
      text: `${name}, your debt stands at ${formatUSD(
        totalDebt
      )}. Pay at least ${formatUSD(
        minDue
      )} this month, and more if you can; small payments, made faithfully, fell even the tallest tree.`,
    };
  }

  return {
    mood: "encouraging",
    text: `${name}, your debt of ${formatUSD(
      totalDebt
    )} can be tamed. Meet your minimum of ${formatUSD(
      minDue
    )}, and add what extra you can spare — diligence today is comfort tomorrow.`,
  };
}

function buildDashboardLine(ctx: DashboardContext): BenMessage {
  const name = withName(ctx.name);
  const { income, spending, debtTotal, net } = ctx;

  if (income <= 0 && spending <= 0) {
    return {
      mood: "encouraging",
      text: `${name}, every great ledger begins with a single entry. Record today’s income and spending, and we shall see the truth clearly.`,
    };
  }

  if (net < 0) {
    return {
      mood: "stern",
      text: `${name}, your outflow exceeds your inflow. When the barrel empties faster than it fills, even a rich harvest cannot save it. Let us trim spending and strengthen income.`,
    };
  }

  if (spending > income) {
    return {
      mood: "witty",
      text: `${name}, your purse is more generous than your paycheck. Beware little expenses; they are the termites of prosperity.`,
    };
  }

  if (debtTotal > 0 && net > 0) {
    return {
      mood: "encouraging",
      text: `${name}, you are earning more than you spend — a fine habit. Let us now turn that surplus against your debt, for interest never sleeps.`,
    };
  }

  return {
    mood: "celebratory",
    text: `${name}, well done. Industry and patience seldom fail to yield their reward, and your numbers today bear witness.`,
  };
}

function buildCrisisLine(ctx: CrisisContext): BenMessage {
  const name = withName(ctx.name);
  const { urgentBillsCount, urgentDebtCount, totalUrgentAmount } = ctx;

  if (urgentBillsCount === 0 && urgentDebtCount === 0) {
    return {
      mood: "encouraging",
      text: `${name}, the barn is not on fire today. Let us still keep water nearby by setting aside a little for tomorrow’s storms.`,
    };
  }

  if (urgentBillsCount + urgentDebtCount >= 3) {
    return {
      mood: "urgent",
      text: `${name}, when the barn is on fire, one does not polish the lantern. You have ${urgentBillsCount} urgent bill${
        urgentBillsCount === 1 ? "" : "s"
      } and ${urgentDebtCount} urgent debt${
        urgentDebtCount === 1 ? "" : "s"
      }, totaling ${formatUSD(
        totalUrgentAmount
      )}. Pay the most essential first — shelter, light, and work.`,
    };
  }

  return {
    mood: "stern",
    text: `${name}, urgency has arrived, but it has not yet overwhelmed you. Cover these pressing amounts of ${formatUSD(
      totalUrgentAmount
    )} with all speed, and we shall restore calm.`,
  };
}

function buildDailyInsightLine(ctx: DailyInsightContext): BenMessage {
  const name = withName(ctx.name);
  const { incomeToday, spendingToday } = ctx;

  if (incomeToday === 0 && spendingToday === 0) {
    return {
      mood: "encouraging",
      text: `${name}, today is a blank page. Write it with intention — a little earned, a little saved, and no dollar wasted.`,
    };
  }

  if (spendingToday > incomeToday) {
    return {
      mood: "stern",
      text: `${name}, you have spent more than you earned today. A day or two of this may be endured; a habit of it cannot.`,
    };
  }

  if (incomeToday > 0 && spendingToday === 0) {
    return {
      mood: "celebratory",
      text: `${name}, you earned without spending today. Such days are the bricks from which financial freedom is built.`,
    };
  }

  return {
    mood: "encouraging",
    text: `${name}, you earned ${formatUSD(
      incomeToday
    )} and spent ${formatUSD(
      spendingToday
    )} today. Keep your eye on the difference — that gap is your future comfort.`,
  };
}

function buildWeeklySummaryLine(ctx: WeeklySummaryContext): BenMessage {
  const name = withName(ctx.name);
  const { incomeWeek, spendingWeek, debtPaidWeek } = ctx;

  if (incomeWeek === 0 && spendingWeek === 0) {
    return {
      mood: "encouraging",
      text: `${name}, this week’s ledger is quiet. Next week, let us give it something to boast of — a bit more earned, a bit less spent.`,
    };
  }

  if (spendingWeek > incomeWeek) {
    return {
      mood: "stern",
      text: `${name}, this week your purse emptied faster than it filled. Let us learn from it, not repeat it.`,
    };
  }

  if (debtPaidWeek > 0) {
    return {
      mood: "celebratory",
      text: `${name}, you paid ${formatUSD(
        debtPaidWeek
      )} toward your debts this week. Each dollar is a vote for your future freedom.`,
    };
  }

  return {
    mood: "encouraging",
    text: `${name}, your week shows progress. Keep your income stout, your spending modest, and your debts shrinking, and time will be your ally.`,
  };
}

/* ---------------- public API ---------------- */

export const BenEngine = {
  getDashboardMessage(ctx: DashboardContext): BenMessage {
    return buildDashboardLine(ctx);
  },

  getDebtMessage(ctx: DebtContext): BenMessage {
    const name = withName(ctx.name);
    return buildDebtLine(name, ctx.totalDebt, ctx.minDueThisMonth, ctx.pastDueCount);
  },

  getForecastMessage(ctx: ForecastContext): BenMessage {
    const name = withName(ctx.name);
    return buildIncomeGapLine(
      name,
      ctx.incomeGap,
      ctx.timeframeLabel,
      ctx.dailyIncomeNeeded
    );
  },

  getCrisisMessage(ctx: CrisisContext): BenMessage {
    return buildCrisisLine(ctx);
  },

  getDailyInsight(ctx: DailyInsightContext): BenMessage {
    return buildDailyInsightLine(ctx);
  },

  getWeeklySummary(ctx: WeeklySummaryContext): BenMessage {
    return buildWeeklySummaryLine(ctx);
  },
};
