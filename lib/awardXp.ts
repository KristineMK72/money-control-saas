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

type DbError = { message: string } | null;

/**
 * Duck-typed client. Callers pass browser or service-role clients as `unknown`
 * so Supabase generics do not explode TypeScript.
 */
type AwardClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string
      ) => {
        maybeSingle: () => Promise<{
          data: ProfileSlice | null;
          error: DbError;
        }>;
      };
    };
    update: (values: Record<string, number>) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{
            data: ProfileSlice | null;
            error: DbError;
          }>;
        };
      };
    };
    insert: (values: Record<string, unknown>) => PromiseLike<{ error: DbError }>;
  };
};

export function paymentXpAmount(isDebt: boolean) {
  return isDebt ? 35 : 25;
}

export function paymentReputationAmount(isDebt: boolean) {
  return isDebt ? 8 : 5;
}

export async function awardXpForPayment(
  supabaseClient: unknown,
  userId: string,
  options: { isDebt?: boolean } = {}
): Promise<AwardXpResult> {
  const supabase = supabaseClient as AwardClient;
  const isDebt = Boolean(options.isDebt);
  const amount = paymentXpAmount(isDebt);
  const repGain = paymentReputationAmount(isDebt);

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("xp, level, reputation")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return fail(amount, readError.message);
  }

  // No profile row yet — create a minimal one so XP has somewhere to land.
  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: userId,
      xp: 0,
      level: 1,
      reputation: 0,
    });
    if (insertError) {
      return fail(
        amount,
        `No profile to award XP (${insertError.message}). Add xp/level/reputation columns if missing.`
      );
    }
  }

  const row = profile || {};
  const currentXp = Number(row.xp ?? 0) || 0;
  const currentRep = Number(row.reputation ?? 0) || 0;
  const previousLevel =
    Number(row.level ?? 0) > 0
      ? Number(row.level)
      : Math.floor(Math.sqrt(currentXp / 10)) + 1;

  const { xp, level } = addXp(currentXp, amount);
  const reputation = currentRep + repGain;

  const { data: updated, error: writeError } = await supabase
    .from("profiles")
    .update({ xp, level, reputation })
    .eq("user_id", userId)
    .select("xp, level, reputation")
    .maybeSingle();

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

  if (!updated) {
    return fail(
      amount,
      "Profile update matched 0 rows. Check profiles.user_id and that xp/level/reputation columns exist."
    );
  }

  return {
    xp: Number(updated.xp ?? xp),
    level: Number(updated.level ?? level),
    previousLevel,
    leveledUp: Number(updated.level ?? level) > previousLevel,
    amount,
    reputation: Number(updated.reputation ?? reputation),
    error: null,
  };
}

function fail(amount: number, error: string): AwardXpResult {
  return {
    xp: 0,
    level: 1,
    previousLevel: 1,
    leveledUp: false,
    amount,
    reputation: 0,
    error,
  };
}
