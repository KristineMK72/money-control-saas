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

const ENDLESS_ERAS: Array<Omit<LevelReward, "level">> = [
  {
    title: "Elder of the Ledger",
    description: "The books stay open. So does the work.",
    reward: "Elder of the Ledger title",
    icon: "📖",
  },
  {
    title: "Harbor Master",
    description: "Ships, bills, and neighbors all find their berth.",
    reward: "Harbor Master title",
    icon: "🌊",
  },
  {
    title: "Architect of the Landing",
    description: "The town grows because the ledger does.",
    reward: "Architect of the Landing title",
    icon: "🏗️",
  },
  {
    title: "Sage of Thrift",
    description: "A penny saved still compounds, even at this altitude.",
    reward: "Sage of Thrift title",
    icon: "🧭",
  },
  {
    title: "Franklin's Peer",
    description: "The hat tip is mutual now.",
    reward: "Franklin's Peer title",
    icon: "⚡",
  },
];

const NAMED_SPAN = 10;
const FIRST_ENDLESS_LEVEL = 60;

export function toRoman(n: number): string {
  if (n <= 0) return "";
  const table: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = Math.floor(n);
  let out = "";
  for (const [value, glyph] of table) {
    while (remaining >= value) {
      out += glyph;
      remaining -= value;
    }
  }
  return out;
}

function endlessRewardAt(level: number): LevelReward {
  const stepsPast = Math.max(0, Math.floor((level - FIRST_ENDLESS_LEVEL) / NAMED_SPAN));
  const cycle = stepsPast % ENDLESS_ERAS.length;
  const generation = Math.floor(stepsPast / ENDLESS_ERAS.length) + 1;
  const era = ENDLESS_ERAS[cycle]!;
  const suffix = generation > 1 ? ` ${toRoman(generation)}` : "";
  const milestoneLevel =
    FIRST_ENDLESS_LEVEL + stepsPast * NAMED_SPAN;

  return {
    level: milestoneLevel,
    title: `${era.title}${suffix}`,
    description: era.description,
    reward: `${era.title}${suffix} title`,
    icon: era.icon,
  };
}

export function getLevelReward(level: number): LevelReward {
  const safeLevel = Math.max(1, Math.floor(level));

  if (safeLevel < FIRST_ENDLESS_LEVEL) {
    let current = LEVEL_REWARDS[0]!;
    for (const reward of LEVEL_REWARDS) {
      if (reward.level <= safeLevel) current = reward;
      else break;
    }
    return current;
  }

  return endlessRewardAt(safeLevel);
}

export function getNextLevelReward(level: number): LevelReward {
  const safeLevel = Math.max(1, Math.floor(level));
  const named = LEVEL_REWARDS.find((reward) => reward.level > safeLevel);
  if (named) return named;

  const stepsPast = Math.max(
    0,
    Math.floor((Math.max(safeLevel, FIRST_ENDLESS_LEVEL - NAMED_SPAN) - FIRST_ENDLESS_LEVEL) / NAMED_SPAN)
  );
  const nextMilestone =
    safeLevel < FIRST_ENDLESS_LEVEL
      ? FIRST_ENDLESS_LEVEL
      : FIRST_ENDLESS_LEVEL + (stepsPast + 1) * NAMED_SPAN;

  return endlessRewardAt(nextMilestone);
}

export function isLevelRewardUnlocked(rewardLevel: number, currentLevel: number) {
  return currentLevel >= rewardLevel;
}
