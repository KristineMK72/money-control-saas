import { create } from "zustand";

export type Bucket = any;
export type Debt = any;
export type Income = any;
export type Spend = any;
export type Payment = any;

type MoneyState = {
  buckets: Bucket[];
  debts: Debt[];
  income: Income[];
  spend: Spend[];
  payments: Payment[];

  setAll: (data: {
    buckets: Bucket[];
    debts: Debt[];
    income: Income[];
    spend: Spend[];
    payments: Payment[];
  }) => void;

  reset: () => void;
};

export const useMoneyStore = create<MoneyState>((set) => ({
  buckets: [],
  debts: [],
  income: [],
  spend: [],
  payments: [],

  setAll: (data) =>
    set({
      buckets: data.buckets || [],
      debts: data.debts || [],
      income: data.income || [],
      spend: data.spend || [],
      payments: data.payments || [],
    }),

  reset: () =>
    set({
      buckets: [],
      debts: [],
      income: [],
      spend: [],
      payments: [],
    }),
}));
