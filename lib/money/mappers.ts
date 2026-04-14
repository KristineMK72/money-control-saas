import type { FinancialItem } from "./normalize";

// ─────────────────────────────
// Bills
// ─────────────────────────────

export function mapBill(row: any): FinancialItem {
  return {
    id: row.id,
    name: row.name,
    kind: "bill",
    amount:
      row.min_payment ??
      row.monthly_target ??
      row.balance ??
      row.target ??
      0,

    dueDate: row.due_date ?? null,
    dueDay: row.due_day ?? null,
    isMonthly: row.is_monthly ?? false,

    category: row.category ?? undefined,
  };
}

// ─────────────────────────────
// Debt
// ─────────────────────────────

export function mapDebt(row: any): FinancialItem {
  return {
    id: row.id,
    name: row.name,
    kind: "debt",
    amount: row.min_payment ?? row.balance ?? 0,

    balance: row.balance ?? 0,
    apr: row.apr ?? undefined,
    creditLimit: row.credit_limit ?? undefined,

    dueDate: row.due_date ?? null,
    dueDay: row.due_day ?? null,
    isMonthly: row.is_monthly ?? false,
  };
}

// ─────────────────────────────
// Income
// ─────────────────────────────

export function mapIncome(row: any): FinancialItem {
  return {
    id: row.id,
    name: row.source_name,
    kind: "income",
    amount: row.amount,
    dueDate: row.date_iso ?? null,
  };
}

// ─────────────────────────────
// Spend
// ─────────────────────────────

export function mapSpend(row: any): FinancialItem {
  return {
    id: row.id,
    name: row.merchant ?? row.category ?? "spend",
    kind: "bill",
    amount: row.amount,
    category: row.category ?? undefined,
    dueDate: row.date_iso ?? null,
  };
}
