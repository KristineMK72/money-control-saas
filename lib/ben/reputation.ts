/**
 * Reputation — how the town (and Ben) perceive the citizen's financial stewardship.
 * Simple numeric score + flavor for now. Can later drive NPC reactions, building unlocks, etc.
 */

import type { FinancialSnapshot } from "./types";
import { speak } from "./speech";

export type ReputationTier =
  | "struggling"
  | "steady"
  | "respectable"
  | "prosperous"
  | "exemplary";

export interface Reputation {
  score: number; // 0–100
  tier: ReputationTier;
  label: string;
  description: string;
}

const TIERS: Array<{ max: number; tier: ReputationTier; label: string; description: string }> = [
  {
    max: 20,
    tier: "struggling",
    label: "In Hardship",
    description: "The town notes the weight upon thy shoulders. Help is available.",
  },
  {
    max: 40,
    tier: "steady",
    label: "Holding Steady",
    description: "Thou keepest the ship afloat. Consistency will bring fairer winds.",
  },
  {
    max: 60,
    tier: "respectable",
    label: "Respectable Citizen",
    description: "Neighbors speak well of thy diligence. The ledger improves.",
  },
  {
    max: 80,
    tier: "prosperous",
    label: "Prosperous Neighbor",
    description: "Thy affairs prosper. The harbor looks kindly upon thee.",
  },
  {
    max: 100,
    tier: "exemplary",
    label: "Exemplary Steward",
    description: "Franklin himself would tip his hat. The whole town benefits from thy example.",
  },
];

/**
 * Compute a simple reputation score from a financial snapshot.
 * This is intentionally transparent and tunable.
 */
export function computeReputation(data: FinancialSnapshot = {}): Reputation {
  let score = 50; // neutral baseline

  // Positive signals
  if (data.debtChange !== undefined && data.debtChange < 0) score += 12;
  if (data.savingsProgress !== undefined) score += Math.round(data.savingsProgress * 20);
  if (data.incomeThisMonth && data.incomeThisMonth > 0) score += 5;
  if (!data.overdueAmount || data.overdueAmount === 0) score += 8;
  if (!data.idleSubscriptions || data.idleSubscriptions === 0) score += 5;

  // Negative signals
  if (data.overdueAmount && data.overdueAmount > 0) score -= 20;
  if (data.billsDueCount && data.billsDueCount >= 4) score -= 8;
  if (data.idleSubscriptions && data.idleSubscriptions >= 3) score -= 6;
  if (data.debtChange !== undefined && data.debtChange > 0) score -= 10;

  score = Math.max(0, Math.min(100, score));

  const tierInfo = TIERS.find((t) => score <= t.max) ?? TIERS[TIERS.length - 1];

  return {
    score,
    tier: tierInfo.tier,
    label: tierInfo.label,
    description: tierInfo.description,
  };
}

/**
 * Ben comments on the citizen's current standing.
 */
export function commentOnReputation(data: FinancialSnapshot = {}) {
  const rep = computeReputation(data);
  return speak({
    context: "general",
    mood: rep.score >= 70 ? "proud" : rep.score >= 40 ? "encouraging" : "concerned",
    location: "TownSquare",
    facts: [`Thy standing in the town: ${rep.label}. ${rep.description}`],
  });
}
