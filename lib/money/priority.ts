import type { BillEntry, DebtEntry } from "./types";
import { daysUntil } from "./utils";

/**
 * Convert a bill's due_day (1–31) into the next actual date.
 */
function nextDueDate(day: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const candidate = new Date(year, month, day);

  // If that date already passed this month → use next month
  if (candidate < now) {
    return new Date(year, month + 1, day).toISOString().slice(0, 10);
  }

  return candidate.toISOString().slice(0, 10);
}

/**
 * Prioritize bills by how soon they are due.
 */
export function prioritizeBills(bills: BillEntry[]) {
  return bills
    .map((b) => {
      const dueDate = nextDueDate(b.due_day);
      return {
        ...b,
        days_until_due: daysUntil(dueDate),
      };
    })
    .sort((a, b) => a.days_until_due - b.days_until_due);
}

/**
 * Prioritize debts by APR first, then due date.
 */
export function prioritizeDebts(debts: DebtEntry[]) {
  return debts
    .map((d) => ({
      ...d,
      days_until_due: d.due_day ? daysUntil(nextDueDate(d.due_day)) : Infinity,
    }))
    .sort((a, b) => {
      if ((b.apr || 0) !== (a.apr || 0)) {
        return (b.apr || 0) - (a.apr || 0);
      }
      return a.days_until_due - b.days_until_due;
    });
}
