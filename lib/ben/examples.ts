/**
 * Usage examples — not imported by the app, just for reference & testing.
 *
 * These show the exact calls every page should make instead of hardcoding text.
 */

import { Ben } from "./brain";
import type { FinancialSnapshot } from "./types";

const sampleData: FinancialSnapshot = {
  incomeThisMonth: 1847,
  remainingIncome: 312,
  billsDueCount: 2,
  daysUntilNextBill: 3,
  totalDebt: 4200,
  debtChange: -150,
  savings: 890,
  savingsProgress: 0.72,
  risingExpenses: ["dining", "subscriptions"],
  idleSubscriptions: 3,
  usualPayday: "Fridays",
  overdueAmount: 0,
};

// ─── Step 1 & 2: Greeting + arrival parchment ───────────────────────────────

export function demoGreeting() {
  // Dashboard / app open
  const greeting = Ben.greet("TownSquare", sampleData);
  console.log(greeting);
  // → { text: "Good morrow! Two obligations arrive within three days.", mood: "encouraging", ... }

  // Location-specific
  const bankHello = Ben.greet("Bank", sampleData);
  const paymentHall = Ben.greet("PaymentHall", sampleData);
}

export function demoArrival() {
  const parchment = Ben.announceArrival(sampleData);
  console.log(parchment);
  /*
    {
      title: "Good morrow!",
      body: "Good morrow! ...\n\nHear ye! Two obligations await...\n\nThou hast earned $1,847 this month. Another $312 remaineth.",
      actions: [
        { label: "Visit Bank", href: "/bank", icon: "🏦" },
        { label: "Visit Payment Hall", href: "/payments", icon: "💰" }
      ],
      dismissible: true
    }
  */
}

// ─── Step 3: Pattern awareness ──────────────────────────────────────────────

export function demoPatterns() {
  const spending = Ben.speak({
    context: "spendingPattern",
    data: sampleData,
    location: "Dashboard",
  });
  // → mentions rising dining, idle subscriptions, usual Friday payday
}

// ─── Step 5: Letters ────────────────────────────────────────────────────────

export function demoLetters() {
  const reminder = Ben.writeLetter({
    type: "billReminder",
    billName: "electric account",
    daysUntilDue: 2,
    data: sampleData,
  });
  /*
    From the Office of Benjamin Franklin

    Good Citizen,

    Thy electric account comes due in two days.

    Fear not.
    Thy current income shall satisfy the obligation.

    I remain,
    Benjamin Franklin
  */
}

// ─── Quests & Reputation ────────────────────────────────────────────────────

export function demoQuestsAndRep() {
  const quests = Ben.suggestQuests(sampleData);
  const rep = Ben.reputation(sampleData);
  const comment = Ben.commentOnReputation(sampleData);
}

// ─── React component shape (conceptual) ─────────────────────────────────────
/*
  // Instead of <BenBubble text="Welcome back" />

  <Ben
    mood={speech.mood}
    location="TownSquare"
    animation={speech.animation}
    speech={speech.text}
  />
*/
