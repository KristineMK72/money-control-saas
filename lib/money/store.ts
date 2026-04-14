"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Bucket,
  DebtEntry,
  Entry,
  IncomeSource,
  PaymentEntry,
  SpendEntry,
} from './types';
import { STORAGE_KEY } from './storageKey';
import { clampMoney } from './utils';

interface MoneyStore {
  buckets: Bucket[];
  entries: Entry[];
  spend: SpendEntry[];
  payments: PaymentEntry[];
  debts: DebtEntry[];
  incomeSources: IncomeSource[];

  totals: {
    income: number;
    spending: number;
    payments: number;
    debtBalance: number;
    debtMinimums: number;
  };

  // Actions
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

export const useMoneyStore = create<MoneyStore>()(
  persist(
    (set, get) => {
      const calculateTotals = () => {
        const { entries, spend, payments, debts } = get();

        const income = entries.reduce((sum, e) => sum + e.amount, 0);
        const spending = spend.reduce((sum, s) => sum + s.amount, 0);
        const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
        const debtTotal = debts.reduce((sum, d) => sum + (d.balance || 0), 0);
        const minDueTotal = debts.reduce((sum, d) => sum + (d.minPayment || 0), 0);

        return {
          income: clampMoney(income),
          spending: clampMoney(spending),
          payments: clampMoney(paymentTotal),
          debtBalance: clampMoney(debtTotal),
          debtMinimums: clampMoney(minDueTotal),
        };
      };

      return {
        // Initial state
        buckets: [],
        entries: [],
        spend: [],
        payments: [],
        debts: [],
        incomeSources: [],

        totals: {
          income: 0,
          spending: 0,
          payments: 0,
          debtBalance: 0,
          debtMinimums: 0,
        },

        addBucket: (bucket) =>
          set((state) => ({ buckets: [bucket, ...state.buckets] })),

        addSpend: (item) =>
          set((state) => ({ spend: [item, ...state.spend] })),

        removeSpend: (id) =>
          set((state) => ({ spend: state.spend.filter((item) => item.id !== id) })),

        addPayment: (item) =>
          set((state) => ({ payments: [item, ...state.payments] })),

        removePayment: (id) =>
          set((state) => ({ payments: state.payments.filter((item) => item.id !== id) })),

        addDebt: (item) =>
          set((state) => ({ debts: [item, ...state.debts] })),

        removeDebt: (id) =>
          set((state) => ({ debts: state.debts.filter((item) => item.id !== id) })),

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

        addIncomeEntry: (params) => {
          const cleanSource = params.sourceName.trim();
          const amt = clampMoney(params.amount);

          if (!cleanSource || !Number.isFinite(amt) || amt <= 0) return;

          const entry: Entry = {
            id: crypto.randomUUID(),
            dateISO: params.dateISO,
            sourceName: cleanSource,
            amount: amt,
            note: params.note?.trim() || undefined,
            allocations: {},
          };

          set((state) => ({
            entries: [entry, ...state.entries].sort((a, b) =>
              a.dateISO < b.dateISO ? 1 : -1
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
            entries: state.entries.filter((e) => e.id !== id),
          })),

        resetAll: () =>
          set({
            buckets: [],
            entries: [],
            spend: [],
            payments: [],
            debts: [],
            incomeSources: [],
            totals: {
              income: 0,
              spending: 0,
              payments: 0,
              debtBalance: 0,
              debtMinimums: 0,
            },
          }),
      };
    },

    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        buckets: state.buckets,
        entries: state.entries,
        spend: state.spend,
        payments: state.payments,   // bills
        debts: state.debts,
        incomeSources: state.incomeSources,
      }),
    }
  )
);

// Re-calculate totals after every state change that affects them
useMoneyStore.subscribe((state, prevState) => {
  if (
    state.entries !== prevState.entries ||
    state.spend !== prevState.spend ||
    state.payments !== prevState.payments ||
    state.debts !== prevState.debts
  ) {
    const newTotals = {
      income: state.entries.reduce((sum, e) => sum + e.amount, 0),
      spending: state.spend.reduce((sum, s) => sum + s.amount, 0),
      payments: state.payments.reduce((sum, p) => sum + p.amount, 0),
      debtBalance: state.debts.reduce((sum, d) => sum + (d.balance || 0), 0),
      debtMinimums: state.debts.reduce((sum, d) => sum + (d.minPayment || 0), 0),
    };

    useMoneyStore.setState({
      totals: {
        income: clampMoney(newTotals.income),
        spending: clampMoney(newTotals.spending),
        payments: clampMoney(newTotals.payments),
        debtBalance: clampMoney(newTotals.debtBalance),
        debtMinimums: clampMoney(newTotals.debtMinimums),
      },
    });
  }
});
