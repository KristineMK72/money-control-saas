export type LevelReward = {
  level: number;
  title: string;
  description: string;
  reward: string;
  icon: string;
};

export const LEVEL_REWARDS: LevelReward[] = [
  {
    level: 1,
    title: "Town Resident",
    description: "Thy journey in Franklin's Landing begins.",
    reward: "Welcome to Franklin's Landing",
    icon: "🏛️",
  },
  {
    level: 5,
    title: "Ledger Keeper",
    description: "Thou hast begun to keep thy financial house in order.",
    reward: "Ledger Keeper title",
    icon: "📜",
  },
  {
    level: 10,
    title: "Treasury Rebuilder",
    description: "Thy treasury now stands upon firmer ground.",
    reward: "Treasury Rebuilder title",
    icon: "🪙",
  },
  {
    level: 15,
    title: "Merchant",
    description: "Thy efforts now reach beyond mere survival.",
    reward: "Merchant title",
    icon: "⚓",
  },
  {
    level: 20,
    title: "Treasurer",
    description: "Thou hast become a steward of considerable means.",
    reward: "Treasurer title",
    icon: "💰",
  },
  {
    level: 25,
    title: "Governor",
    description: "Thy colony now looks to thee for leadership.",
    reward: "Governor title",
    icon: "🏛️",
  },
  {
    level: 30,
    title: "Colonial Advisor",
    description: "Thy command of financial affairs has grown formidable.",
    reward: "Colonial Advisor title",
    icon: "🧠",
  },
  {
    level: 40,
    title: "Master of Coin",
    description: "Thy financial judgment has reached uncommon heights.",
    reward: "Master of Coin title",
    icon: "🪙",
  },
  {
    level: 50,
    title: "Founder of Prosperity",
    description: "Thou hast built a lasting foundation for prosperity.",
    reward: "Founder of Prosperity title",
    icon: "🏆",
  },
];

export function getLevelReward(level: number): LevelReward {
  const safeLevel = Math.max(1, level);
  let current = LEVEL_REWARDS[0]!;
  for (const reward of LEVEL_REWARDS) {
    if (reward.level <= safeLevel) {
      current = reward;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevelReward(level: number): LevelReward | null {
  const safeLevel = Math.max(1, level);
  return LEVEL_REWARDS.find((reward) => reward.level > safeLevel) ?? null;
}

export function isLevelRewardUnlocked(rewardLevel: number, currentLevel: number) {
  return currentLevel >= rewardLevel;
}
