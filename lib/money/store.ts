import { create } from "zustand";

export type Spend = { amount: number; category: string };
export type Debt = any;
export type Income = any;
export type Bucket = any;
export type Payment = any;

type MoneyState = {
  buckets: Bucket[];
  debts: Debt[];
  income: Income[];
  spend: Spend[];
  payments: Payment[];

  setAll: (data: Partial<MoneyState>) => void;
  reset: () => void;

  // 👇 ADD THIS (fixes your error)
  getTotals: () => {
    totalSpend: number;
    byCategory: Record<string, number>;
  };
};

export const useMoneyStore = create<MoneyState>((set, get) => ({
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

  getTotals: () => {
    const spend = get().spend;

    const byCategory: Record<string, number> = {};

    let totalSpend = 0;

    for (const item of spend) {
      totalSpend += Number(item.amount || 0);

      const cat = item.category || "misc";
      byCategory[cat] = (byCategory[cat] || 0) + Number(item.amount || 0);
    }

    return { totalSpend, byCategory };
  },
}));
