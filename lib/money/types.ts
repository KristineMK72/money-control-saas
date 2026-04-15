cat > lib/money/types.ts << 'EOF'
export type BucketKind = "bill" | "credit" | "loan" | "savings";

export type BucketCategory =
  | "housing"
  | "utilities"
  | "transportation"
  | "debt"
  | "food"
  | "other";

/* ───────────────── BUCKETS ───────────────── */
export type Bucket = {
  key: string;
  name: string;
  kind: BucketKind;
  category?: BucketCategory | null;

  // ✅ Supabase standard
  due_date?: string | null;
  focus?: boolean | null;
};

/* ───────────────── INCOME ───────────────── */
export type IncomeSource = {
  id: string;
  name: string;
};

export type IncomeEntry = {
  id: string;
  user_id: string;
  date_iso: string;
  source_name: string;
  amount: number;
  note?: string | null;

  allocations: Record<string, number>;
};

/* ───────────────── SPENDING ───────────────── */
export type SpendCategory =
  | "groceries"
  | "gas"
  | "eating_out"
  | "bills"
  | "kids"
  | "business"
  | "self_care"
  | "subscriptions"
  | "misc";

export type SpendEntry = {
  id: string;
  user_id: string;
  date_iso: string;
  merchant: string | null;
  amount: number;
  category: SpendCategory;
  note?: string | null;
};

/* ───────────────── PAYMENTS ───────────────── */
export type PaymentEntry = {
  id: string;
  user_id: string;
  date_iso: string;
  merchant: string;
  amount: number;
  note?: string | null;
};

/* ───────────────── DEBT ───────────────── */
export type DebtEntry = {
  id: string;
  user_id: string;
  name: string;

  balance: number;

  // ✅ unified Supabase-style naming
  min_payment?: number | null;

  due_date?: string | null;
  is_monthly?: boolean | null;
  due_day?: number | null;

  apr?: number | null;
  credit_limit?: number | null;

  note?: string | null;
};
