/** Row shapes for Supabase views in `supabase/migrations/20250512120100_ben_views.sql`. */

export type BenMasterRow = {
  user_id: string;
  total_income: number;
  total_spend: number;
  total_debt_balance: number;
  total_debt_minimums: number;
  net: number;
  total_obligations: number;
  income_gap: number;
};

export type BenWeeklyRow = {
  user_id: string;
  window_start: string;
  window_end: string;
  bills_due_week: number;
  debts_due_week: number;
  income_all: number;
  spend_all: number;
  payments_all: number;
  gap_week: number;
};
