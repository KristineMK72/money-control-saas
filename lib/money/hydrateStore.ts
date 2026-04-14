import { useMoneyStore } from "./store";
import type {
  Bucket,
  DebtEntry,
  IncomeEntry,
  SpendEntry,
  PaymentEntry,
} from "./types";

export function hydrateMoneyStore(data: {
  buckets?: Bucket[];
  debts?: DebtEntry[];
  income?: IncomeEntry[];
  spend?: SpendEntry[];
  payments?: PaymentEntry[];
}) {
  useMoneyStore.setState({
    buckets: data.buckets ?? [],
    debts: data.debts ?? [],
    income: data.income ?? [],     // ✅ NOT entries
    spend: data.spend ?? [],
    payments: data.payments ?? [],
  });
}
