"use client";

import { useEffect, useMemo, useState } from "react";
import GovernorsOrders from "@/components/GovernorsOrders";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getRank(reputation: number) {
  if (reputation >= 5000) return "Founder of the Republic";
  if (reputation >= 2000) return "Governor";
  if (reputation >= 1000) return "Colonial Treasurer";
  if (reputation >= 500) return "Revenue Collector";
  if (reputation >= 250) return "Treasury Keeper";
  if (reputation >= 100) return "Ledger Keeper";
  return "Apprentice Clerk";
}

export default function GovernorPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reputation, setReputation] = useState(0);
  const [loading, setLoading] = useState(true);

  const rank = getRank(reputation);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("reputation")
      .eq("user_id", user.id)
      .maybeSingle();

    setReputation(Number(data?.reputation ?? 0));
    setLoading(false);
  }

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[2rem] border border-white/20 bg-black/70 p-4 shadow-2xl md:p-8">
          <div className="rounded-[1.5rem] bg-white p-6 text-zinc-950 shadow-xl md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">
              AskBen Command Center
            </p>

            <h1 className="mt-3 text-5xl font-black leading-none md:text-6xl">
              Governor&apos;s Office
            </h1>

            <p className="mt-4 text-lg font-bold leading-8 text-zinc-600">
              Good morrow, Governor. The Treasury awaits thy guidance.
            </p>

            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                Reputation
              </p>

              <p className="mt-2 text-5xl font-black text-emerald-950">
                {loading ? "..." : reputation}
              </p>

              <p className="mt-1 text-lg font-black text-emerald-800">
                {rank}
              </p>
            </div>
          </div>
        </div>

        <GovernorsOrders
          onReward={(amount) => setReputation((prev) => prev + amount)}
        />
      </section>
    </main>
  );
}
