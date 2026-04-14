// ─────────────────────────────────────────────
// Core Shared Types
// ─────────────────────────────────────────────

export type ID = string;

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export type Category =
  | "housing"
  | "utilities"
  | "transportation"
  | "debt"
  | "food"
  | "other";

// ─────────────────────────────────────────────
// Unified Financial Building Block (NEW)
// ─────────────────────────────────────────────

export type FinancialKind =
  | "bill"
  | "debt"
  | "bucket"
  | "goal";

export type BaseFinancial = {
  id: ID;
  name: string;
  category?: Category;
  priority?: PriorityLevel;

  dueDate?: string | null;
  dueDay?: number | null;
  isMonthly?: boolean;

  amount?: number;
};

// ─────────────────────────────────────────────
// Bucket (Savings / Goals / Bills container)
// ─────────────────────────────────────────────

export type Bucket = BaseFinancial & {
  kind: "bucket" | "goal" | "bill" | "credit" | "loan";

  target: number;
  saved: number;

  focus?: boolean;

  balance?: number;
  apr?: number;
  minPayment?: number;
  creditLimit?: number;
};

// ─────────────────────────────────────────────
// Debt (still exists but simplified)
// ─────────────────────────────────────────────

export type DebtEntry = BaseFinancial & {
  kind: "credit" | "loan";

  balance: number;

  minPayment?: number;
  remainingBalance?: number;

  apr?: number;
  creditLimit?: number;

  note?: string;
};

// ─────────────────────────────────────────────
// Income
// ─────────────────────────────────────────────

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

  allocations: Partial<Record<ID, number>>;
};

// ─────────────────────────────────────────────
// Spending
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Payments (unified linking layer)
// ─────────────────────────────────────────────

export type PaymentEntry = {
  id: ID;
  dateISO: string;
  amount: number;

  bucketId?: ID;
  debtId?: ID;

  merchant?: string;
  note?: string;
};

// ─────────────────────────────────────────────
// Storage Shape (root state)
// ─────────────────────────────────────────────

export type StorageShape = {
  buckets: Bucket[];
  debts: DebtEntry[];

  income: IncomeEntry[];
  spend: SpendEntry[];
  payments: PaymentEntry[];

  incomeSources: IncomeSource[];

  meta?: {
    lastMonthlyApplied?: string;
  };
};
