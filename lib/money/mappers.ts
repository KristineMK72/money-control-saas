import type { DebtEntry } from "@/lib/money/types";

export function mapDebt(row: any): DebtEntry {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    balance: row.balance ?? 0,

    dueDate: row.due_date ?? null,
    minPayment: row.min_payment ?? null,
    monthlyMinPayment: row.monthly_min_payment ?? null,

    isMonthly: row.is_monthly ?? false,
    dueDay: row.due_day ?? null,

    apr: row.apr ?? null,
    creditLimit: row.credit_limit ?? null,
    remainingBalance: row.remaining_balance ?? null,
  };
}
