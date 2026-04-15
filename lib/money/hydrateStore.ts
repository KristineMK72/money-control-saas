import type {
  Bucket,
  DebtEntry,
  IncomeEntry,
  SpendEntry,
  PaymentEntry,
} from "./types";

/**
 * Hydrated financial state used across the app.
 * This is your single normalized “money state layer”.
 */
export type HydratedStore = {
  buckets: Bucket[];
  debts: DebtEntry[];
  income: IncomeEntry[];
  spend: SpendEntry[];
  payments: PaymentEntry[];
};

/**
 * Basic hydration helper:
 * Ensures arrays are always safe + never undefined.
 */
export function hydrateStore(input: Partial<HydratedStore>): HydratedStore {
  return {
    buckets: input.buckets ?? [],
    debts: input.debts ?? [],
    income: input.income ?? [],
    spend: input.spend ?? [],
    payments: input.payments ?? [],
  };
}

/**
 * Optional helper: compute total spend
 */
export function getTotalSpend(store: HydratedStore): number {
  return store.spend.reduce((sum, item) => sum + (item.amount || 0), 0);
}

/**
 * Optional helper: compute total income
 */
export function getTotalIncome(store: HydratedStore): number {
  return store.income.reduce((sum, item) => sum + (item.amount || 0), 0);
}

/**
 * Optional helper: net cashflow
 */
export function getNetCashflow(store: HydratedStore): number {
  return getTotalIncome(store) - getTotalSpend(store);
}
