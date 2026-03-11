export type BillLike = {
  name: string;
  amount: number;
  dueDate?: string;
  kind?: string;
  essential?: boolean;
};

export type IncomeLike = {
  name: string;
  amount: number;
  expectedDate?: string;
};

export type BucketLike = {
  name: string;
  saved: number;
  focus?: boolean;
};

export type FinancialSnapshotInput = {
  availableCash: number;
  bills: BillLike[];
  expectedIncome?: IncomeLike[];
  buckets?: BucketLike[];
};

export type FinancialSnapshot = {
  stressScore: number;
  next7BillsTotal: number;
  next14BillsTotal: number;
  next7IncomeTotal: number;
  shortfall7: number;
  summaryText: string;
};

function daysUntil(dateStr?: string) {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const today = new Date();
  const due = new Date(dateStr + "T12:00:00");
  const diffMs = due.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function buildFinancialSnapshot(
  input: FinancialSnapshotInput
): FinancialSnapshot {
  const bills = input.bills ?? [];
  const expectedIncome = input.expectedIncome ?? [];
  const buckets = input.buckets ?? [];

  const next7Bills = bills.filter((b) => daysUntil(b.dueDate) <= 7);
  const next14Bills = bills.filter((b) => daysUntil(b.dueDate) <= 14);
  const next7Income = expectedIncome.filter((i) => daysUntil(i.expectedDate) <= 7);

  const next7BillsTotal = next7Bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const next14BillsTotal = next14Bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const next7IncomeTotal = next7Income.reduce((sum, i) => sum + (i.amount || 0), 0);

  const focusBucketReserve = buckets
    .filter((b) => b.focus)
    .reduce((sum, b) => sum + (b.saved || 0), 0);

  const totalAvailable = (input.availableCash || 0) + next7IncomeTotal;
  const shortfall7 = Math.max(0, next7BillsTotal - totalAvailable);

  let score = 100;
  score -= Math.min(40, next7BillsTotal * 0.08);
  score += Math.min(20, totalAvailable * 0.05);
  score += Math.min(10, focusBucketReserve * 0.03);
  score -= Math.min(35, shortfall7 * 0.12);

  const urgentCount = bills.filter((b) => daysUntil(b.dueDate) <= 3).length;
  score -= urgentCount * 6;

  score = clamp(Math.round(score), 0, 100);

  const summaryLines = [
    `Available cash: $${input.availableCash.toFixed(2)}`,
    `Bills due in next 7 days: $${next7BillsTotal.toFixed(2)}`,
    `Bills due in next 14 days: $${next14BillsTotal.toFixed(2)}`,
    `Expected income in next 7 days: $${next7IncomeTotal.toFixed(2)}`,
    `Shortfall in next 7 days: $${shortfall7.toFixed(2)}`,
    `Focus bucket reserves: $${focusBucketReserve.toFixed(2)}`,
    "",
    "Upcoming bills:",
    ...next14Bills.map(
      (b) =>
        `- ${b.name}: $${b.amount.toFixed(2)}${
          b.dueDate ? ` due ${b.dueDate}` : ""
        }${b.essential ? " [essential]" : ""}`
    ),
    "",
    "Expected income:",
    ...next7Income.map(
      (i) =>
        `- ${i.name}: $${i.amount.toFixed(2)}${
          i.expectedDate ? ` expected ${i.expectedDate}` : ""
        }`
    ),
    "",
    "Buckets:",
    ...buckets.map((b) => `- ${b.name}: $${b.saved.toFixed(2)}`),
  ];

  return {
    stressScore: score,
    next7BillsTotal,
    next14BillsTotal,
    next7IncomeTotal,
    shortfall7,
    summaryText: summaryLines.join("\n"),
  };
}
