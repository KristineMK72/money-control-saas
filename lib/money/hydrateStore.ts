import { useMoneyStore } from "./store";
import type { Bucket, DebtEntry, IncomeEntry, SpendEntry, PaymentEntry } from "./types";

export function hydrateMoneyStore(data: {
  buckets?: Bucket[];
  debts?: DebtEntry[];
  income?: IncomeEntry[];
  spend?: SpendEntry[];
  payments?: PaymentEntry[];
}) {
  const store = useMoneyStore.getState();

  if (data.buckets) store.resetAll();

  useMoneyStore.setState({
    buckets: data.buckets ?? [],
    debts: data.debts ?? [],
    entries: data.income ?? [],
    spend: data.spend ?? [],
    payments: data.payments ?? [],
  });
}
