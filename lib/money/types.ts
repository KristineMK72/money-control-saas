// Core Money Types for SaaS-Ready Financial Engine

export type UUID = string;

// -----------------------------
// Payment Methods
// -----------------------------
export type PaymentMethod =
  | "debit"
  | "credit"
  | "checking"
  | "cash"
  | "paypal"
  | "venmo"
  | "apple_pay"
  | "other";

// -----------------------------
// Spend Categories
// -----------------------------
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


// -----------------------------
// Spend Entry
// -----------------------------
export type SpendEntry = {
  id: UUID;
  user_id: UUID;
  date_iso: string;
  merchant: string | null;
  amount: number;
  category: SpendCategory;
  payment_method: PaymentMethod;
  note?: string | null;
};

// -----------------------------
// Income Entry
// -----------------------------
export type IncomeEntry = {
  id: UUID;
  user_id: UUID;
  source: string;
  amount: number;
  date_iso: string;
  is_recurring: boolean;
  frequency?: "weekly" | "biweekly" | "monthly" | "custom";
};

// -----------------------------
// Bill Entry
// -----------------------------
export type BillEntry = {
  id: UUID;
  user_id: UUID;
  name: string;
  amount: number;
  due_day: number; // 1–31
  is_fixed: boolean;
  is_monthly: boolean;
};

// -----------------------------
// Debt Entry
// -----------------------------
export type DebtEntry = {
  id: UUID;
  user_id: UUID;
  name: string;
  balance: number;
  apr: number | null;
  min_payment: number;
  due_day: number | null;
  is_credit: boolean;
};

// -----------------------------
// Forecast Types
// -----------------------------
export type ForecastPoint = {
  date_iso: string;
  balance: number;
  income: number;
  bills: number;
  spend: number;
  credit_spend: number;
  cash_spend: number;
};

export type ForecastResult = {
  start_date: string;
  end_date: string;
  points: ForecastPoint[];
};

// -----------------------------
// User Settings
// -----------------------------
export type UserSettings = {
  id: UUID;
  user_id: UUID;
  currency: string;
  start_week_on: "sunday" | "monday";
  enable_ben_mood: boolean;
  enable_forecasting: boolean;
};
