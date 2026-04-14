// lib/money/types.ts

/* ─────────────────────────────
   CORE BUCKET SYSTEM
──────────────────────────── */

export type BucketKind = "bill" | "credit" | "loan" | "savings";

export type BucketCategory =
  | "housing"
  | "utilities"
  | "transportation"
  | "debt"
  | "food"
  | "other";

export type Bucket = {
  key: string;
  name: string;
  kind: BucketKind;
  category?: BucketCategory;
};

/* ─────────────────────────────
   INCOME SYSTEM
──────────────────────────── */

export type IncomeSource = {
  id: string;
  name: string;
};

export type Entry = {
  id: string;
  dateISO: string;
  sourceName: string;
  amount: number;
  note?: string;
  allocations: Record<string, number>;
};

/* ─────────────────────────────
   SPENDING SYSTEM (FIXED + MATCHES UI)
──────────────────────────── */

export const SPEND_CATEGORIES = [
  "groceries",
  "gas",
  "eating_out",
  "kids",
  "business",
  "self_care",
  "subscriptions",
  "bills",
  "other",
] as const;

export type SpendCategory = typeof SPEND_CATEGORIES[number];

export type SpendEntry = {
  id: string;
  dateISO: string;
  merchant: string;
  amount: number;
  category: SpendCategory;
  note?: string;
};

/* ─────────────────────────────
   PAYMENTS (BILLS / RECURRING)
──────────────────────────── */

export type PaymentEntry = {
  id: string;
  name: string;
  amount: number;
  dueDate?: string;
};

/* ─────────────────────────────
   DEBT SYSTEM (STABLE MODEL)
──────────────────────────── */

export type DebtEntry = {
  id: string;
  name: string;

  balance: number;
  minPayment: number;

  dueDate?: string;

  isMonthly?: boolean;
  dueDay?: number;

  note?: string;
};
