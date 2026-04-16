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
      text: `${prefix}${baseMessage}`,
      mood,
    };
  },
};
