// /lib/ben/engine.ts

import { BenMessages } from "./messages";
import { BenInput, BenOutput, BenMood } from "./types";

/* ---------------- UTILITIES ---------------- */

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ---------------- MOOD LOGIC ---------------- */

function determineMood(input: BenInput): BenMood {
  const { incomeSoFar, totalNeeded, incomeGap } = input;

  // No obligations → calm encouragement
  if (totalNeeded <= 0) return "encouraging";

  // Large deficit → urgent
  if (incomeGap > totalNeeded * 0.4) return "urgent";

  // Slight deficit → stern
  if (incomeGap > 0) return "stern";

  // Surplus → celebratory
  if (incomeSoFar >= totalNeeded * 1.2) return "celebratory";

  // On track → encouraging
  return "encouraging";
}

/* ---------------- PREFIX BUILDER ---------------- */

function buildPrefix(name: string | null, timeframeLabel: string): string {
  const who = name ? `${name}, ` : "";
  const where = timeframeLabel ? `${timeframeLabel.toLowerCase()}. ` : "";
  return who + where;
}

function money(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function buildDataReadout(input: BenInput): string {
  const { totalNeeded, incomeSoFar, incomeGap, dailyIncomeNeeded } = input;

  if (totalNeeded <= 0 && incomeSoFar > 0) {
    return ` I see ${money(incomeSoFar)} logged. The next sensible move is to give those dollars a job before they wander off.`;
  }

  if (totalNeeded <= 0) {
    return " Add a few entries and I can turn this room from vibes into a proper ledger.";
  }

  if (incomeGap > 0) {
    return ` The ledger shows ${money(totalNeeded)} needed, ${money(incomeSoFar)} covered, and ${money(incomeGap)} still open. Aim for about ${money(dailyIncomeNeeded)} per day until this gap behaves.`;
  }

  const cushion = Math.max(0, incomeSoFar - totalNeeded);
  if (cushion > 0) {
    return ` The ledger shows ${money(totalNeeded)} needed and ${money(incomeSoFar)} covered, leaving about ${money(cushion)} of breathing room. Guard it like a tiny treasury.`;
  }

  return ` The ledger shows ${money(totalNeeded)} needed and ${money(incomeSoFar)} covered. You are balanced, which is delightfully boring and useful.`;
}

/* ---------------- ENGINE ---------------- */

export const BenEngine = {
  getForecastMessage(input: BenInput): BenOutput {
    const mood = determineMood(input);

    // Pick a message from the correct mood bucket
    const lines = BenMessages[mood];
    const baseMessage = pickRandom(lines);

    // Build prefix (name + timeframe)
    const prefix = buildPrefix(input.name, input.timeframeLabel);

    return {
      text: `${prefix}${baseMessage}${buildDataReadout(input)}`,
      mood,
    };
  },
};
