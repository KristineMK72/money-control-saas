import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { addXp } from "@/lib/xp";

type AwardXpArgs = {
  amount: number;
  reason: string;
  eventKey: string; // unique per user so we never double-award
};

export async function awardXp({ amount, reason, eventKey }: AwardXpArgs) {
  const supabase = createSupabaseBrowserClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { awarded: false, amount: 0, level: 1, message: "Not signed in." };
  }

  // Idempotent: same event_key never awards twice
  const { error: eventError } = await supabase.from("xp_events").insert({
    user_id: user.id,
    event_key: eventKey,
    amount,
    reason,
  });

  if (eventError) {
    if (eventError.code === "23505") {
      return { awarded: false, amount: 0, level: 1, message: "Already rewarded." };
    }
    return { awarded: false, amount: 0, level: 1, message: eventError.message };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { awarded: false, amount: 0, level: 1, message: profileError.message };
  }

  const currentXp = Number(profile?.xp ?? 0);
  const { xp, level } = addXp(currentXp, amount);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp, level })
    .eq("user_id", user.id);

  if (updateError) {
    return { awarded: false, amount: 0, level: 1, message: updateError.message };
  }

  return {
    awarded: true,
    amount,
    level,
    message: `+${amount} XP · Level ${level}`,
  };
}
