import type { DebtEntry } from "@/lib/money/types";

// ─────────────────────────────────────────────
// Debt Mapper (Supabase → App Model)
// ─────────────────────────────────────────────

export function mapDebtRow(row: any): DebtEntry {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind ?? "loan",

    // core values
    balance: Number(row.balance ?? 0),

    // unified payment field (ONLY ONE USED IN APP)
    minPayment: Number(row.monthly_min_payment ?? row.min_payment ?? 0),

    // scheduling
    dueDate: row.due_date ?? null,
    isMonthly: Boolean(row.is_monthly ?? false),
    dueDay: row.due_day ?? null,

    // optional financial metadata
    apr: row.apr ?? null,
    creditLimit: row.credit_limit ?? null,

    // tracking
    remainingBalance: row.remaining_balance ?? null,

    // notes
    note: row.note ?? null,
  };
}
