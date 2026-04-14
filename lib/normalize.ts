// lib/money/normalize.ts

export type FinancialItemKind =
  | "bill"
  | "debt"
  | "bucket"
  | "income";

export type FinancialItem = {
  id: string;
  name: string;
  kind: FinancialItemKind;

  amount: number;

  dueDate?: string | null;
  dueDay?: number | null;
  isMonthly?: boolean;

  category?: string;

  // debt-only fields
  balance?: number;
  apr?: number;
  creditLimit?: number;

  // bucket-only fields
  target?: number;

  meta?: Record<string, any>;
};
