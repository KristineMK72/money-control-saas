// ── Core Types ───────────────────────────────────────

export type ID = string;

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export type Category =
  | "housing"
  | "utilities"
  | "transportation"
  | "debt"
  | "food"
  | "other";

export type BucketKind = "bill" | "credit" | "loan";

// ── Bucket (Bills + Savings + Debt Targets) ──────────

export type Bucket = {
  id: ID;
  name: string;
  kind: BucketKind;
  category?: Category;

  // money tracking
  target: number;
  saved: number;

  // scheduling
  dueDate?: string | null;
  isMonthly?: boolean;
  dueDay?: number | null;

  // priority + focus
  priority?: PriorityLevel;
  focus?: boolean;

  // debt-specific (optional)
  balance?: number;
  apr?: number;
  minPayment?: number;
  creditLimit?: number;
};

// ── Income ───────────────────────────────────────────

export type IncomeSource = {
  id: ID;
  name: string;
};

export type IncomeEntry = {
  id: ID;
  dateISO: string;
  sourceId?: ID;
  sourceName: string;
  amount: number;
  note?: string;

  // allocation across buckets
  allocations: Partial<Record<ID, number>>;
};

// ── Spending ─────────────────────────────────────────

export type SpendCategory =
  | "groceries"
  | "gas"
  | "eating_out"
  | "kids"
  | "business"
  | "self_care"
  | "subscriptions"
  | "misc";

export type SpendEntry = {
  id: ID;
  dateISO: string;
  amount: number;
  category: SpendCategory;
  merchant?: string;
  note?: string;
};

// ── Payments (Debt / Bills) ──────────────────────────

export type PaymentEntry = {
  id: ID;
  dateISO: string;
  amount: number;

  bucketId?: ID; // 🔥 key improvement (link to bucket)
  debtId?: ID;   // optional direct link

  merchant?: string;
  note?: string;
};

// ── Debt (Standalone, but aligns with Bucket) ────────

export type DebtEntry = {
  id: ID;
  name: string;
  kind: "credit" | "loan";

  balance: number;

  // normalized fields (no more mismatch)
  minPayment?: number;
  dueDate?: string | null;
  isMonthly?: boolean;
  dueDay?: number | null;

  apr?: number;
  creditLimit?: number;
  remainingBalance?: number;

  note?: string;
};

// ── Root Storage ─────────────────────────────────────

export type StorageShape = {
  buckets: Bucket[];
  income: IncomeEntry[];
  spend: SpendEntry[];
  payments: PaymentEntry[];
  debts: DebtEntry[];
  incomeSources: IncomeSource[];

  meta?: {
    lastMonthlyApplied?: string;
  };
};
