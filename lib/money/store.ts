import { create } from "zustand";

/* ---------------- TYPES ---------------- */
export type Spend = {
  id?: string;
  amount: number;
  category: string;
};

export type Income = { amount: number };
export type Debt = { amount: number };
export type Bucket = any;
export type Payment = any;

/* ---------------- STATE ---------------- */
type MoneyState = {
  buckets: Bucket[];
  debts: Debt[];
  income: Income[];
  spend: Spend[];
  payments: Payment[];

  setAll: (data: Partial<MoneyState>) => void;
  reset: () => void;
};

/* ---------------- STORE ---------------- */
export const useMoneyStore = create<MoneyState>((set) => ({
  buckets: [],
  debts: [],
  income: [],
  spend: [],
  payments: [],

  setAll: (data) =>
    set((state) => ({
      ...state,
      ...data,
    })),

  reset: () =>
    set({
      buckets: [],
      debts: [],
      income: [],
      spend: [],
      payments: [],
    }),
}));
