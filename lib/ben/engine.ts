// /lib/ben/engine.ts

import { BenMessages } from "./messages";
import { BenInput, BenOutput, BenMood } from "./types";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMood(input: BenInput): BenMood {
  const { incomeSoFar, totalNeeded, incomeGap } = input;

  // No obligations yet → calm encouragement
  if (totalNeeded <= 0) return "encouraging";

  // Big gap → urgent
  if (incomeGap > totalNeeded * 0.4) return "urgent";

  // Slightly behind → stern but not panicked
  if (incomeGap > 0) return "stern";

  // Ahead by a lot → celebratory
  if (incomeSoFar >= totalNeeded * 1.2) return "celebratory";

  // Slightly ahead or on track → encouraging
  return "encouraging";
}

function buildPrefix(name: string | null, timeframeLabel: string): string {
  const who = name ? `${name}, ` : "";
  const where = timeframeLabel ? `${timeframeLabel.toLowerCase()}. ` : "";
  return who + (where ? where : "");
}

export const BenEngine = {
  getForecastMessage(input: BenInput): BenOutput {
    const mood = getMood(input);
    const lines = BenMessages[mood];
    const base = pickRandom(lines);

    const prefix = buildPrefix(input.name, input.timeframeLabel);

    return {
      text: `${prefix}${base}`,
      mood,
    };
  },
};
