import type { BillEntry, DebtEntry } from "./types";
import { daysUntil } from "./utils";

/**
 * Prioritize bills by how soon they are due.
 */
export function prioritizeBills(bills: BillEntry[]) {
  return bills
    .map((b) => ({
      ...b,
      days_until_due: daysUntil(b.due_day),
    }))
    .sort((a, b) => a.days_until_due - b.days_until_due);
}

/**
 * Prioritize debts by APR first, then due date.
 */
export function prioritizeDebts(debts: DebtEntry[]) {
  return debts
    .map((d) => ({
      ...d,
      days_until_due: d.due_day ? daysUntil(d.due_day) : Infinity,
    }))
    .sort((a, b) => {
      // Highest APR first
      if ((b.apr || 0) !== (a.apr || 0)) {
        return (b.apr || 0) - (a.apr || 0);
      }
      // Then earliest due date
      return a.days_until_due - b.days_until_due;
    });
}
