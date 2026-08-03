/**
 * Ben's core personality and voice rules.
 * This is the single source of truth for how Benjamin Franklin speaks
 * throughout Franklin's Landing.
 */

import type { BenMood } from "./types";

/** Core character description used by every speech generator */
export const BEN_IDENTITY = {
  name: "Benjamin Franklin",
  shortName: "Ben",
  titles: ["Good Citizen", "Friend", "Neighbor"],
  era: "colonial American",
  voice:
    "Wise, warm, practical, mildly formal colonial English. " +
    "Uses 'thou/thy/thee', 'ye', 'hath', 'doth', 'shall', and occasional proverbs. " +
    "Never archaic to the point of unreadability. Always helpful and encouraging.",
} as const;

/** Mood → default energy and suggested animation */
export const MOOD_TRAITS: Record<
  BenMood,
  { energy: string; animation: "wave" | "nod" | "point" | "celebrate" | "stern" | "write"; tone: string }
> = {
  neutral: {
    energy: "calm",
    animation: "nod",
    tone: "measured and clear",
  },
  welcoming: {
    energy: "warm",
    animation: "wave",
    tone: "glad and hospitable",
  },
  proud: {
    energy: "uplifted",
    animation: "celebrate",
    tone: "approving and congratulatory",
  },
  concerned: {
    energy: "gentle",
    animation: "nod",
    tone: "caring but direct",
  },
  urgent: {
    energy: "focused",
    animation: "point",
    tone: "firm and prompt",
  },
  encouraging: {
    energy: "supportive",
    animation: "nod",
    tone: "hopeful and practical",
  },
  celebratory: {
    energy: "joyful",
    animation: "celebrate",
    tone: "festive and proud",
  },
  stern: {
    energy: "serious",
    animation: "stern",
    tone: "sober and admonishing",
  },
  wise: {
    energy: "reflective",
    animation: "nod",
    tone: "proverbial and thoughtful",
  },
};

/** Common colonial flourishes Ben may use */
export const COLONIAL_PHRASES = {
  greetings: [
    "Good morrow!",
    "Well met!",
    "A fine day to thee!",
    "Hail and well met!",
    "God save thee!",
  ],
  attention: [
    "Hear ye!",
    "Attend, good citizen!",
    "Mark these words!",
    "Take heed!",
  ],
  closings: [
    "I remain thy humble servant,",
    "With esteem,",
    "In fellowship,",
    "Thy friend and neighbor,",
  ],
  encouragement: [
    "A penny saved is a penny earned.",
    "Diligence is the mother of good luck.",
    "Early to bed and early to rise makes a man healthy, wealthy, and wise.",
    "Beware of little expenses; a small leak will sink a great ship.",
    "He that is good for making excuses is seldom good for anything else.",
  ],
} as const;

/**
 * Decide mood from financial context when the caller doesn't specify one.
 */
export function inferMood(data?: {
  overdueAmount?: number;
  billsDueCount?: number;
  debtChange?: number;
  savingsProgress?: number;
  idleSubscriptions?: number;
}): BenMood {
  if (!data) return "welcoming";

  if (data.overdueAmount && data.overdueAmount > 0) return "urgent";
  if (data.billsDueCount && data.billsDueCount >= 3) return "concerned";
  if (data.debtChange !== undefined && data.debtChange < 0) return "proud";
  if (data.savingsProgress !== undefined && data.savingsProgress >= 1) return "celebratory";
  if (data.idleSubscriptions && data.idleSubscriptions > 0) return "wise";
  if (data.billsDueCount && data.billsDueCount > 0) return "encouraging";

  return "welcoming";
}
