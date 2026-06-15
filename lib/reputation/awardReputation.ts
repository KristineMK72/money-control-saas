import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AwardReputationArgs = {
  eventType: string;
  amount: number;
  reason: string;
  eventKey: string;
};

export async function awardReputation({
  eventType,
  amount,
  reason,
  eventKey,
}: AwardReputationArgs) {
  const supabase = createSupabaseBrowserClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { awarded: false, amount: 0, message: "Not signed in." };
  }

  const { error: eventError } = await supabase.from("reputation_events").insert({
    user_id: user.id,
    event_key: eventKey,
    event_type: eventType,
    amount,
    reason,
  });

  if (eventError) {
    if (eventError.code === "23505") {
      return { awarded: false, amount: 0, message: "Already rewarded." };
    }

    return { awarded: false, amount: 0, message: eventError.message };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("reputation")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { awarded: false, amount: 0, message: profileError.message };
  }

  const current = Number(profile?.reputation ?? 0);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ reputation: current + amount })
    .eq("user_id", user.id);

  if (updateError) {
    return { awarded: false, amount: 0, message: updateError.message };
  }

  return { awarded: true, amount, message: `+${amount} Reputation` };
}
