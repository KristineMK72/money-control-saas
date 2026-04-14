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

// ── Bucket ───────────────────────────────
export type Bucket = {
  id: ID;
  name: string;
  kind: BucketKind;
  category?: Category;

  target: number;
  saved: number;

  dueDate?: string | null;
  isMonthly?: boolean;
  dueDay?: number | null;

  priority?: PriorityLevel;
  focus?: boolean;

  balance?: number;
  apr?: number;
  minPayment?: number;
  creditLimit?: number;
};

// ── Income ───────────────────────────────
export type IncomeSource = {
  id: ID;
  name: string;
};

export type IncomeEntry = {
  id: ID;
  dateISO: string;
  sourceName: string;
  amount: number;
  note?: string;
  allocations: Partial<Record<ID, number>>;
};

// ── Spending ─────────────────────────────
export type SpendEntry = {
  id: ID;
  dateISO: string;
  export type SpendCategory =
  | "groceries"
  | "gas"
  | "eating_out"
  | "kids"
  | "business"
  | "self_care"
  | "subscriptions"
  | "misc";
  amount: number;
  category: "groceries" | "gas" | "eating_out" | "kids" | "business" | "self_care" | "subscriptions" | "misc";
  merchant?: string;
  note?: string;
};

// ── Payments ─────────────────────────────
export type PaymentEntry = {
  id: ID;
  dateISO: string;
  amount: number;
  bucketId?: ID;
  debtId?: ID;
  merchant?: string;
  note?: string;
};

// ── Debt (CLEAN FINAL FORM) ──────────────
export type DebtEntry = {
  id: ID;
  name: string;
  kind: "credit" | "loan";

  balance: number;

  minPayment?: number;
  dueDate?: string | null;

  isMonthly?: boolean;
  dueDay?: number | null;

  apr?: number;
  creditLimit?: number;
};

// ── STORAGE ──────────────────────────────
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
