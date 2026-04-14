"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type {
  Bucket,
  DebtEntry,
  IncomeEntry,
  IncomeSource,
  PaymentEntry,
  SpendEntry,
} from "./types";

import { STORAGE_KEY } from "./storageKey";
import { clampMoney } from "./utils";

// ─────────────────────────────────────────────
// STORE SHAPE
// ─────────────────────────────────────────────

interface MoneyStore {
  buckets: Bucket[];
  income: IncomeEntry[];
  spend: SpendEntry[];
  payments: PaymentEntry[];
  debts: DebtEntry[];
  incomeSources: IncomeSource[];

  // ─────────────────────────────
  // Actions
  // ─────────────────────────────

  addBucket: (bucket: Bucket) => void;

  addSpend: (item: SpendEntry) => void;
  removeSpend: (id: string) => void;

  addPayment: (item: PaymentEntry) => void;
  removePayment: (id: string) => void;

  addDebt: (item: DebtEntry) => void;
  removeDebt: (id: string) => void;

  addIncomeSource: (name: string) => void;

  addIncomeEntry: (params: {
    dateISO: string;
    sourceName: string;
    amount: number;
    note?: string;
  }) => void;

  removeIncomeEntry: (id: string) => void;

  resetAll: () => void;
}

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────

export const useMoneyStore = create<MoneyStore>()(
  persist(
    (set, get) => ({
      // ─────────────────────────────
      // STATE
      // ─────────────────────────────

      buckets: [],
      income: [],
      spend: [],
      payments: [],
      debts: [],
      incomeSources: [],

      // ─────────────────────────────
      // BUCKETS
      // ─────────────────────────────

      addBucket: (bucket) =>
        set((state) => ({
          buckets: [bucket, ...state.buckets],
        })),

      // ─────────────────────────────
      // SPEND
      // ─────────────────────────────

      addSpend: (item) =>
        set((state) => ({
          spend: [item, ...state.spend],
        })),

      removeSpend: (id) =>
        set((state) => ({
          spend: state.spend.filter((s) => s.id !== id),
        })),

      // ─────────────────────────────
      // PAYMENTS
      // ─────────────────────────────

      addPayment: (item) =>
        set((state) => ({
          payments: [item, ...state.payments],
        })),

      removePayment: (id) =>
        set((state) => ({
          payments: state.payments.filter((p) => p.id !== id),
        })),

      // ─────────────────────────────
      // DEBTS
      // ─────────────────────────────

      addDebt: (item) =>
        set((state) => ({
          debts: [item, ...state.debts],
        })),

      removeDebt: (id) =>
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        })),

      // ─────────────────────────────
      // INCOME SOURCES
      // ─────────────────────────────

      addIncomeSource: (name) => {
        const clean = name.trim();
        if (!clean) return;

        const exists = get().incomeSources.some(
          (s) => s.name.toLowerCase() === clean.toLowerCase()
        );

        if (exists) return;

        const source: IncomeSource = {
          id: crypto.randomUUID(),
          name: clean,
        };

        set((state) => ({
          incomeSources: [source, ...state.incomeSources].sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        }));
      },

      // ─────────────────────────────
      // INCOME ENTRIES (UPDATED)
      // ─────────────────────────────

      addIncomeEntry: (params) => {
        const cleanSource = params.sourceName.trim();
        const amount = clampMoney(params.amount);

        if (!cleanSource || amount <= 0) return;

        const entry: IncomeEntry = {
          id: crypto.randomUUID(),
          dateISO: params.dateISO,
          sourceName: cleanSource,
          amount,
          note: params.note?.trim(),
          allocations: {},
        };

        set((state) => ({
          income: [entry, ...state.income].sort(
            (a, b) => (a.dateISO < b.dateISO ? 1 : -1)
          ),
        }));

        const exists = get().incomeSources.some(
          (s) => s.name.toLowerCase() === cleanSource.toLowerCase()
        );

        if (!exists) {
          get().addIncomeSource(cleanSource);
        }
      },

      removeIncomeEntry: (id) =>
        set((state) => ({
          income: state.income.filter((e) => e.id !== id),
        })),

      // ─────────────────────────────
      // RESET
      // ─────────────────────────────

      resetAll: () =>
        set({
          buckets: [],
          income: [],
          spend: [],
          payments: [],
          debts: [],
          incomeSources: [],
        }),
    }),

    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        buckets: state.buckets,
        income: state.income,
        spend: state.spend,
        payments: state.payments,
        debts: state.debts,
        incomeSources: state.incomeSources,
      }),
    }
  )
);

// ─────────────────────────────────────────────
// TOTALS (UPDATED)
// ─────────────────────────────────────────────

export const getTotals = () => {
  const { income, spend, payments, debts } =
    useMoneyStore.getState();

  const incomeTotal = income.reduce((sum, e) => sum + e.amount, 0);
  const spendingTotal = spend.reduce((sum, s) => sum + s.amount, 0);
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);

  const debtBalance = debts.reduce(
    (sum, d) => sum + (d.balance || 0),
    0
  );

  const debtMinimums = debts.reduce(
    (sum, d) => sum + (d.minPayment || 0),
    0
  );

  return {
    income: clampMoney(incomeTotal),
    spending: clampMoney(spendingTotal),
    payments: clampMoney(paymentTotal),
    debtBalance: clampMoney(debtBalance),
    debtMinimums: clampMoney(debtMinimums),
  };
};
