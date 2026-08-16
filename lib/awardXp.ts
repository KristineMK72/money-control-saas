import { addXp } from "@/lib/xp";

export type AwardXpResult = {
  xp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  amount: number;
  reputation: number;
  error: string | null;
};

type ProfileSlice = {
  xp?: number | null;
  level?: number | null;
  reputation?: number | null;
};

type QueryError = { message: string } | null;

/** Minimal chainable client shape (browser or service-role Supabase). */
type ProfileQuery = {
  select: (columns: string) => ProfileQuery;
  update: (values: Record<string, number>) => ProfileQuery;
  eq: (column: string, value: string) => ProfileQuery;
  maybeSingle: () => Promise<{ data: ProfileSlice | null; error: QueryError }>;
  then?: unknown;
};

type AwardSupabase = {
  from: (table: string) => ProfileQuery;
};

/** XP granted when a payment is recorded. Debt payments earn a bit more. */
export function paymentXpAmount(isDebt: boolean) {
  return isDebt ? 35 : 25;
}

export function paymentReputationAmount(isDebt: boolean) {
  return isDebt ? 8 : 5;
}

/**
 * Award XP + reputation on profiles after a successful payment insert.
 * Works with browser or service-role Supabase clients (must be allowed by RLS / service role).
 */
export async function awardXpForPayment(
  supabase: AwardSupabase,
  userId: string,
  options: { isDebt?: boolean } = {}
): Promise<AwardXpResult> {
  const isDebt = Boolean(options.isDebt);
  const amount = paymentXpAmount(isDebt);
  const repGain = paymentReputationAmount(isDebt);

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("xp, level, reputation")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return {
      xp: 0,
      level: 1,
      previousLevel: 1,
      leveledUp: false,
      amount,
      reputation: 0,
      error: readError.message,
    };
  }

  const row = (profile || {}) as ProfileSlice;
  const currentXp = Number(row.xp ?? 0) || 0;
  const currentRep = Number(row.reputation ?? 0) || 0;
  const previousLevel =
    Number(row.level ?? 0) > 0
      ? Number(row.level)
      : Math.floor(Math.sqrt(currentXp / 10)) + 1;

  const { xp, level } = addXp(currentXp, amount);
  const reputation = currentRep + repGain;

  const writeResult = (await supabase
    .from("profiles")
    .update({ xp, level, reputation })
    .eq("user_id", userId)) as { error?: QueryError };

  const writeError = writeResult?.error ?? null;

  if (writeError) {
    return {
      xp: currentXp,
      level: previousLevel,
      previousLevel,
      leveledUp: false,
      amount,
      reputation: currentRep,
      error: writeError.message,
    };
  }

  return {
    xp,
    level,
    previousLevel,
    leveledUp: level > previousLevel,
    amount,
    reputation,
    error: null,
  };
}
