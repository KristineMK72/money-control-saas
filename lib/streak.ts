/**
 * Calculates current and best streaks from an array of activity date strings (YYYY-MM-DD).
 * A streak is consecutive calendar days with at least one activity.
 * If today has no activity but yesterday does, the streak is still alive (grace day).
 */
export function calculateStreak(rawDates: (string | null | undefined)[]): {
  current:      number;
  best:         number;
  lastActive:   string | null;
  todayActive:  boolean;
  streakAlive:  boolean; // true if streak is current or was active yesterday
} {
  const dates = rawDates
    .filter(Boolean)
    .map(d => (d as string).slice(0, 10))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));

  if (dates.length === 0) {
    return { current: 0, best: 0, lastActive: null, todayActive: false, streakAlive: false };
  }

  // Unique dates descending
  const unique = [...new Set(dates)].sort().reverse();

  const todayStr     = localToday();
  const yesterdayStr = localOffset(-1);

  const todayActive  = unique[0] === todayStr;
  const lastActive   = unique[0] ?? null;
  const streakAlive  = unique[0] === todayStr || unique[0] === yesterdayStr;

  // Current streak: walk back from today (or yesterday if no entry today)
  let current   = 0;
  let checkDate = todayActive ? todayStr : yesterdayStr;

  for (const date of unique) {
    if (date === checkDate) {
      current++;
      checkDate = localOffset(-current - (todayActive ? 0 : 1));
    } else if (date < checkDate) {
      break;
    }
  }

  // Best streak: longest consecutive run across all dates
  let best      = current;
  let run       = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + "T12:00:00Z");
    const curr = new Date(unique[i]     + "T12:00:00Z");
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diff === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  return { current, best, lastActive, todayActive, streakAlive };
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
