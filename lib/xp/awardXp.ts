import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { playLevelUp, playXpGain } from "@/lib/sounds";

type AwardXpArgs = {
  amount: number;
  reason: string;
  eventKey: string; // unique per user, e.g. "achievement:first_trade"
  playSound?: boolean;
};

function levelFromXp(xp: number) {
  // Infinite levels: floor(sqrt(xp / 10)) + 1
  return Math.floor(Math.sqrt(Math.max(0, xp) / 10)) + 1;
}

export async function awardXp({
  amount,
  reason,
  eventKey,
  playSound = true,
}: AwardXpArgs): Promise<{
  ok: boolean;
  alreadyClaimed?: boolean;
  xp?: number;
  level?: number;
  leveledUp?: boolean;
  error?: string;
}> {
  if (!amount || amount <= 0 || !eventKey) {
    return { ok: false, error: "Invalid XP award" };
  }

  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not signed in" };
  }

  // 1) Idempotent event insert
  const { error: insertError } = await supabase.from("xp_events").insert({
    user_id: user.id,
    event_key: eventKey,
    amount,
    reason,
  });

  if (insertError) {
    // 23505 = unique_violation → already claimed
    if (insertError.code === "23505") {
      return { ok: true, alreadyClaimed: true };
    }
    return { ok: false, error: insertError.message };
  }

  // 2) Load current profile XP
  // Note: if your profiles PK is `id` not `user_id`, change the .eq() below
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const prevXp = Number(profile?.xp ?? 0);
  const prevLevel = Number(profile?.level ?? levelFromXp(prevXp));
  const nextXp = prevXp + amount;
  const nextLevel = levelFromXp(nextXp);
  const leveledUp = nextLevel > prevLevel;

  // 3) Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp: nextXp, level: nextLevel })
    .eq("user_id", user.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // 4) Sounds
  if (playSound) {
    if (leveledUp) playLevelUp();
    else playXpGain();
  }

  return {
    ok: true,
    xp: nextXp,
    level: nextLevel,
    leveledUp,
  };
}
