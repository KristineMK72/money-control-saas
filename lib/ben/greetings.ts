/**
 * Location-aware and context-aware greetings from Ben.
 */

import type { BenLocation, BenMood, FinancialSnapshot } from "./types";
import { COLONIAL_PHRASES, inferMood } from "./personality";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Generate a greeting for the given location and optional financial data.
 */
export function generateGreeting(
  location: BenLocation = "Dashboard",
  data?: FinancialSnapshot,
  preferredMood?: BenMood
): { text: string; mood: BenMood; title?: string } {
  const mood = preferredMood ?? inferMood(data);
  const opener = pick(COLONIAL_PHRASES.greetings);

  // Location-flavored base
  const locationLines: Record<BenLocation, string[]> = {
    TownSquare: [
      `${opener} Franklin's Landing rejoices in thy return.`,
      `${opener} The square is livelier for thy presence.`,
      `Well met in the square! What news from thy ledgers?`,
    ],
    Bank: [
      `${opener} Welcome to the Bank. Thy accounts stand ready for inspection.`,
      `Good morrow at the Bank. How fare thy coffers today?`,
    ],
    PaymentHall: [
      `${opener} The Payment Hall awaits. Let us settle what is due with dignity.`,
      `Hear ye! Obligations gather in this hall. We shall face them together.`,
    ],
    GovernorsOffice: [
      `${opener} The Governor's Office receives thee. Affairs of state—and of purse—await.`,
      `Well met in the Governor's chambers. Let us review the town's prosperity.`,
    ],
    Church: [
      `${opener} Peace be with thee. Even in matters of coin, reflection serves us well.`,
    ],
    Harbor: [
      `${opener} A ship may bring fortune—or bills. What tidings from the sea of accounts?`,
    ],
    Dashboard: [
      `${opener} Franklin's Landing rejoices in thy return.`,
      `${opener} Thy ledgers and the town both await thy attention.`,
      `Good morrow! Let us see how the colony of thy finances prospers.`,
    ],
    Letter: [
      `From the desk of Benjamin Franklin,`,
    ],
    TownCrier: [
      `Hear ye! Hear ye!`,
    ],
  };

  let text = pick(locationLines[location] ?? locationLines.Dashboard);

  // Enrich with light financial awareness when available
  if (data) {
    if (data.overdueAmount && data.overdueAmount > 0) {
      text = `${opener} Urgent matters require thy attention. An obligation of ${formatCurrency(data.overdueAmount)} has grown overdue.`;
    } else if (data.billsDueCount && data.billsDueCount > 0) {
      const count = data.billsDueCount;
      const days = data.daysUntilNextBill;
      if (days !== undefined && days <= 3) {
        text = `${opener} ${count === 1 ? "One obligation" : `${count} obligations`} arrive${count === 1 ? "s" : ""} within ${days} day${days === 1 ? "" : "s"}.`;
      } else {
        text = `${opener} ${count === 1 ? "One bill awaits" : `${count} bills await`} thy attention.`;
      }
    } else if (data.incomeThisMonth && data.incomeThisMonth > 0) {
      text = `${opener} Thou hast earned ${formatCurrency(data.incomeThisMonth)} this month. Well done.`;
    }
  }

  return {
    text,
    mood,
    title: mood === "urgent" || mood === "concerned" ? "Hear ye!" : undefined,
  };
}
