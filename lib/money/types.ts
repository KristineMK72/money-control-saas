// lib/money/types.ts

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
   INCOME
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
   SPENDING (FIXED)
──────────────────────────── */

export type SpendCategory =
  | "groceries"
  | "gas"
  | "eating_out"
  | "bills"
  | "other";

export type SpendEntry = {
  id: string;
  dateISO: string;
  merchant: string;
  amount: number;   // IMPORTANT (your error source)
  category: SpendCategory;
  note?: string;
};

/* ─────────────────────────────
   PAYMENTS / BILLS
──────────────────────────── */

export type PaymentEntry = {
  id: string;
  name: string;
  amount: number;
  dueDate?: string;
};

/* ─────────────────────────────
   DEBT (STABLE MODEL)
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
