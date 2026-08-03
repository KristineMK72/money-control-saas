/**
 * Ben writes letters.
 * Instead of cold notifications, the citizen receives a colonial envelope.
 */

import type { BenLetter, FinancialSnapshot } from "./types";
import { COLONIAL_PHRASES } from "./personality";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uid(): string {
  return `letter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type LetterType =
  | "billReminder"
  | "overdueNotice"
  | "paycheckArrived"
  | "debtProgress"
  | "savingsGoal"
  | "idleSubscriptions"
  | "generalEncouragement";

interface LetterRequest {
  type: LetterType;
  data?: FinancialSnapshot;
  /** Optional specific bill name, e.g. "electric account" */
  billName?: string;
  /** Days until due */
  daysUntilDue?: number;
}

/**
 * Compose a full letter from Ben.
 */
export function writeLetter(request: LetterRequest): BenLetter {
  const { type, data, billName, daysUntilDue } = request;
  const closing = pick(COLONIAL_PHRASES.closings);

  switch (type) {
    case "billReminder": {
      const name = billName ?? "an account";
      const days = daysUntilDue ?? data?.daysUntilNextBill ?? 2;
      const body = [
        "Good Citizen,",
        "",
        `Thy ${name} comes due in ${days} day${days === 1 ? "" : "s"}.`,
        "",
        data?.incomeThisMonth && data.incomeThisMonth > 0
          ? "Fear not. Thy current income shall satisfy the obligation."
          : "I encourage thee to review thy ledgers and prepare payment in good time.",
        "",
        closing,
        "Benjamin Franklin",
      ].join("\n");

      return {
        id: uid(),
        from: "Office of Benjamin Franklin",
        subject: `Regarding thy ${name}`,
        body,
        urgency: days <= 2 ? "high" : "medium",
        related: data,
        sealed: true,
      };
    }

    case "overdueNotice": {
      const amount = data?.overdueAmount ?? 0;
      const body = [
        "Good Citizen,",
        "",
        `An obligation of ${formatCurrency(amount)} has grown overdue.`,
        "",
        "Swift settlement preserves both thy reputation in the town and the peace of thy own mind.",
        "Visit the Payment Hall at thy earliest convenience.",
        "",
        closing,
        "Benjamin Franklin",
      ].join("\n");

      return {
        id: uid(),
        from: "Office of Benjamin Franklin",
        subject: "An overdue matter requires attention",
        body,
        urgency: "high",
        related: data,
        sealed: true,
      };
    }

    case "paycheckArrived": {
      const amount = data?.incomeThisMonth ?? 0;
      const body = [
        "Good Citizen,",
        "",
        amount > 0
          ? `Glad tidings! A sum of ${formatCurrency(amount)} has entered thy accounts.`
          : "Glad tidings! Fresh funds have entered thy accounts.",
        "",
        "A ship enters the harbor when honest labor is rewarded. Use it wisely.",
        "",
        closing,
        "Benjamin Franklin",
      ].join("\n");

      return {
        id: uid(),
        from: "Office of Benjamin Franklin",
        subject: "Thy labor bears fruit",
        body,
        urgency: "low",
        related: data,
        sealed: true,
      };
    }

    case "debtProgress": {
      const change = data?.debtChange ?? 0;
      const body = [
        "Good Citizen,",
        "",
        change < 0
          ? `Excellent news. Thy debt has lessened by ${formatCurrency(Math.abs(change))}.`
          : "I write to encourage continued diligence against thy obligations.",
        "",
        "Every payment is a brick removed from a heavy wall. Keep at it.",
        "",
        closing,
        "Benjamin Franklin",
      ].join("\n");

      return {
        id: uid(),
        from: "Office of Benjamin Franklin",
        subject: "Progress against thy debts",
        body,
        urgency: "low",
        related: data,
        sealed: true,
      };
    }

    case "savingsGoal": {
      const body = [
        "Good Citizen,",
        "",
        "Huzzah! Thou hast reached a savings goal.",
        "",
        "Children may yet run through the square, and the church bell ring, in quiet celebration of thy foresight.",
        "",
        closing,
        "Benjamin Franklin",
      ].join("\n");

      return {
        id: uid(),
        from: "Office of Benjamin Franklin",
        subject: "A goal well met",
        body,
        urgency: "low",
        related: data,
        sealed: true,
      };
    }

    case "idleSubscriptions": {
      const count = data?.idleSubscriptions ?? 1;
      const body = [
        "Good Citizen,",
        "",
        `${count === 1 ? "One subscription remains" : `${count} subscriptions remain`} idle upon thy ledger.`,
        "",
        "Beware of little expenses; a small leak will sink a great ship. Consider whether these still serve thee.",
        "",
        closing,
        "Benjamin Franklin",
      ].join("\n");

      return {
        id: uid(),
        from: "Office of Benjamin Franklin",
        subject: "Idle charges upon thy account",
        body,
        urgency: "medium",
        related: data,
        sealed: true,
      };
    }

    case "generalEncouragement":
    default: {
      const body = [
        "Good Citizen,",
        "",
        "I write only to say that steady habits compound, just as interest does.",
        "Continue as thou hast, and prosperity shall not be far off.",
        "",
        closing,
        "Benjamin Franklin",
      ].join("\n");

      return {
        id: uid(),
        from: "Office of Benjamin Franklin",
        subject: "A word of encouragement",
        body,
        urgency: "low",
        related: data,
        sealed: true,
      };
    }
  }
}
