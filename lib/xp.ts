export function addXp(currentXp: number, amount: number) {
  const safeCurrentXp = Number.isFinite(currentXp) ? currentXp : 0;
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  const xp = Math.max(0, safeCurrentXp + safeAmount);
  const level = Math.floor(Math.sqrt(xp / 10)) + 1;

  return { xp, level };
}

export function getXpForLevel(level: number) {
  const safeLevel = Math.max(1, level);
  return Math.pow(safeLevel - 1, 2) * 10;
}

export function getLevelProgress(xp: number, level: number) {
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const needed = nextLevelXp - currentLevelXp;
  const earned = xp - currentLevelXp;

  return {
    currentLevelXp,
    nextLevelXp,
    needed,
    earned,
    percent: Math.min(100, Math.max(0, (earned / needed) * 100)),
  };
}
