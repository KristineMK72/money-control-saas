/**
 * Quests — lightweight goals Ben can assign and celebrate.
 * Kept minimal for now; the full quest system can grow later.
 */

import type { FinancialSnapshot } from "./types";
import { speak } from "./speech";

export type QuestStatus = "available" | "active" | "completed" | "failed";

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  /** Optional progress 0–1 */
  progress?: number;
  /** Reward flavor text */
  rewardFlavor?: string;
}

/**
 * Example starter quests derived from financial state.
 * These are suggestions Ben can surface; the app decides which to activate.
 */
export function suggestQuests(data: FinancialSnapshot = {}): Quest[] {
  const quests: Quest[] = [];

  if (data.overdueAmount && data.overdueAmount > 0) {
    quests.push({
      id: "clear_overdue",
      title: "Clear the Overdue",
      description: "Settle all overdue obligations so the storm clouds may part.",
      status: "available",
      rewardFlavor: "The church bell will ring once more.",
    });
  }

  if (data.idleSubscriptions && data.idleSubscriptions > 0) {
    quests.push({
      id: "audit_subscriptions",
      title: "Audit the Idle",
      description: `Review and cancel ${data.idleSubscriptions === 1 ? "the idle subscription" : "idle subscriptions"} that no longer serve thee.`,
      status: "available",
      rewardFlavor: "A small leak plugged; the ship sails safer.",
    });
  }

  if (data.savingsProgress !== undefined && data.savingsProgress < 1) {
    quests.push({
      id: "reach_savings_goal",
      title: "Fill the Strongbox",
      description: "Reach thy current savings goal.",
      status: "available",
      progress: data.savingsProgress,
      rewardFlavor: "Children will run through the square.",
    });
  }

  if (data.debtChange === undefined || data.debtChange >= 0) {
    quests.push({
      id: "reduce_debt",
      title: "Lighten the Burden",
      description: "Reduce thy total debt this period.",
      status: "available",
      rewardFlavor: "The town will take quiet notice of thy diligence.",
    });
  }

  return quests;
}

/**
 * Ben's reaction when a quest is completed.
 */
export function celebrateQuest(quest: Quest) {
  return speak({
    context: "celebration",
    mood: "celebratory",
    location: "TownSquare",
    facts: [
      `Thou hast completed the quest: "${quest.title}".`,
      quest.rewardFlavor ?? "Well done.",
    ],
  });
}
