/**
 * Core speech engine.
 * Turns context + financial data into in-character lines from Ben.
 */

import type { BenSpeech, BenSpeechRequest, FinancialSnapshot } from "./types";
import { generateGreeting } from "./greetings";
import { COLONIAL_PHRASES, inferMood, MOOD_TRAITS } from "./personality";

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

/**
 * Build a contextual speech line from financial data.
 */
function buildFromData(context: BenSpeechRequest["context"], data: FinancialSnapshot): string {
  switch (context) {
    case "billsDue": {
      const count = data.billsDueCount ?? 0;
      if (count === 0) return "No obligations press upon thee at this hour. A rare and pleasant calm.";
      if (data.daysUntilNextBill !== undefined && data.daysUntilNextBill <= 3) {
        return `Hear ye! ${count === 1 ? "One obligation awaits" : `${count} obligations await`} thy attention within ${data.daysUntilNextBill} day${data.daysUntilNextBill === 1 ? "" : "s"}.`;
      }
      return `Hear ye! ${count === 1 ? "One bill stands ready" : `${count} bills stand ready`} for thy review.`;
    }

    case "incomeSummary": {
      const earned = data.incomeThisMonth ?? 0;
      const remaining = data.remainingIncome;
      if (remaining !== undefined && remaining > 0) {
        return `Thou hast earned ${formatCurrency(earned)} this month. Another ${formatCurrency(remaining)} remaineth.`;
      }
      return `Thou hast earned ${formatCurrency(earned)} this month. A solid showing.`;
    }

    case "debtUpdate": {
      if (data.debtChange !== undefined) {
        if (data.debtChange < 0) {
          return `Excellent! Thy debt shrinks by ${formatCurrency(Math.abs(data.debtChange))}. The church bell may yet ring in celebration.`;
        }
        if (data.debtChange > 0) {
          return `Thy obligations have grown by ${formatCurrency(data.debtChange)}. Let us chart a course to reverse the tide.`;
        }
      }
      if (data.totalDebt !== undefined) {
        return `Thy total debt stands at ${formatCurrency(data.totalDebt)}. Steady progress will lighten this burden.`;
      }
      return "Thy debts remain under watchful eye.";
    }

    case "savingsMilestone": {
      if (data.savingsProgress !== undefined && data.savingsProgress >= 1) {
        return "Huzzah! Thy savings goal is reached. Children may yet run through the square in celebration.";
      }
      if (data.savings !== undefined) {
        return `Thy savings now stand at ${formatCurrency(data.savings)}. A growing store against leaner days.`;
      }
      return "Thy savings continue to gather strength.";
    }

    case "spendingPattern": {
      const parts: string[] = [];
      if (data.risingExpenses?.length) {
        parts.push(`Dining and other expenses have risen these past weeks—particularly ${data.risingExpenses.slice(0, 2).join(" and ")}.`);
      }
      if (data.idleSubscriptions && data.idleSubscriptions > 0) {
        parts.push(
          `${data.idleSubscriptions === 1 ? "One subscription remains" : `${data.idleSubscriptions} subscriptions remain`} idle. Consider whether they still serve thee.`
        );
      }
      if (data.usualPayday) {
        parts.push(`I note thou art usually paid on ${data.usualPayday}.`);
      }
      if (parts.length === 0) {
        return "Thy spending patterns appear steady. Continue as thou hast.";
      }
      return parts.join(" ");
    }

    case "warning": {
      if (data.overdueAmount && data.overdueAmount > 0) {
        return `Take heed! An amount of ${formatCurrency(data.overdueAmount)} has grown overdue. Swift action preserves both purse and reputation.`;
      }
      return "Matters require thy prompt attention.";
    }

    case "celebration": {
      return pick([
        "Well done! The town prospers with thee.",
        "A fine achievement. Let the harbor flags fly!",
        "Excellent stewardship. Franklin himself would approve.",
      ]);
    }

    default:
      return "How may I be of service to thee this day?";
  }
}

/**
 * Main entry point: produce a full BenSpeech object.
 */
export function speak(request: BenSpeechRequest): BenSpeech {
  const { context, location = "Dashboard", data, mood: requestedMood } = request;
  const mood = requestedMood ?? inferMood(data);
  const traits = MOOD_TRAITS[mood];

  // Greetings are special-cased for location flavor
  if (context === "greeting") {
    const g = generateGreeting(location, data, mood);
    return {
      text: g.text,
      mood: g.mood,
      location,
      title: g.title,
      animation: traits.animation,
    };
  }

  // Data-driven contexts
  let text: string;
  if (data && ["billsDue", "incomeSummary", "debtUpdate", "savingsMilestone", "spendingPattern", "warning", "celebration"].includes(context)) {
    text = buildFromData(context, data);
  } else if (request.facts?.length) {
    text = request.facts.join(" ");
  } else {
    text = "I am at thy service. What shall we examine?";
  }

  // Light proverb injection for wise / encouraging moods
  if ((mood === "wise" || mood === "encouraging") && Math.random() < 0.25) {
    text += " " + pick(COLONIAL_PHRASES.encouragement);
  }

  return {
    text,
    mood,
    location,
    title: mood === "urgent" ? "Hear ye!" : mood === "celebratory" ? "Huzzah!" : undefined,
    animation: traits.animation,
  };
}

/**
 * Convenience: multi-line summary for the "parchment drop" on app open.
 */
export function buildArrivalAnnouncement(data: FinancialSnapshot): {
  lines: string[];
  mood: ReturnType<typeof inferMood>;
  actions: Array<{ label: string; href: string; icon?: string }>;
} {
  const lines: string[] = [];
  const greeting = generateGreeting("TownSquare", data);
  lines.push(greeting.text);

  if (data.billsDueCount && data.billsDueCount > 0) {
    const billLine = buildFromData("billsDue", data);
    lines.push(billLine);
  }

  if (data.incomeThisMonth) {
    lines.push(buildFromData("incomeSummary", data));
  }

  if (data.remainingIncome && data.remainingIncome > 0 && !data.incomeThisMonth) {
    lines.push(`Another ${formatCurrency(data.remainingIncome)} remaineth expected.`);
  }

  const actions = [
    { label: "Visit Income Ledger", href: "/income", icon: "🏦" },
    { label: "Visit Payment Hall", href: "/payments", icon: "💰" },
  ];

  return {
    lines,
    mood: greeting.mood,
    actions,
  };
}
