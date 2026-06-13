"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Order = {
  id: number;
  text: string;
  complete: boolean;
};

const REWARD_AMOUNT = 75;

export default function GovernorsOrders() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [orders, setOrders] = useState<Order[]>([
    {
      id: 1,
      text: "Review one debt",
      complete: false,
    },
    {
      id: 2,
      text: "Inspect upcoming obligations",
      complete: false,
    },
    {
      id: 3,
      text: "Record one payment",
      complete: false,
    },
  ]);

  const [rewardGiven, setRewardGiven] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [rewardMessage, setRewardMessage] = useState("");

  const completed = orders.filter((order) => order.complete).length;
  const allComplete = completed === orders.length;

  useEffect(() => {
    if (allComplete && !rewardGiven && !savingReward) {
      void awardReputation();
    }
  }, [allComplete, rewardGiven, savingReward]);

  function toggleOrder(id: number) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, complete: !order.complete } : order
      )
    );
  }

  async function awardReputation() {
    setSavingReward(true);
    setRewardMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSavingReward(false);
      setRewardMessage("Sign in again so the Treasury can record thy reward.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("reputation")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      setSavingReward(false);
      setRewardMessage(`Could not read reputation: ${profileError.message}`);
      return;
    }

    const currentReputation = Number(profile?.reputation ?? 0);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        reputation: currentReputation + REWARD_AMOUNT,
      })
      .eq("user_id", user.id);

    setSavingReward(false);

    if (updateError) {
      setRewardMessage(`Could not save reward: ${updateError.message}`);
      return;
    }

    setRewardGiven(true);
    setRewardMessage(
      `The Treasury recorded thy reward: +${REWARD_AMOUNT} Reputation. Refresh the page to see the new total.`
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/95 p-5 text-zinc-950 shadow-2xl md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            📯 Daily Dispatch
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950">
            Governor&apos;s Orders
          </h2>

          <p className="mt-2 text-sm font-bold leading-6 text-zinc-700">
            Good morrow, Governor. The Treasury awaits thy guidance.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-left shadow-sm md:text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Reward
          </p>
          <p className="mt-1 text-lg font-black text-zinc-950">
            🏅 +{REWARD_AMOUNT} Reputation
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {orders.map((order) => (
          <label
            key={order.id}
            className={
              order.complete
                ? "flex cursor-pointer items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-950 transition"
                : "flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-black text-zinc-900 transition hover:bg-amber-100"
            }
          >
            <input
              type="checkbox"
              checked={order.complete}
              onChange={() => toggleOrder(order.id)}
              className="h-5 w-5 accent-emerald-600"
            />

            <span className={order.complete ? "line-through opacity-75" : ""}>
              {order.text}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-zinc-600">
          <span>Progress</span>
          <span>
            {completed}/{orders.length}
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{
              width: `${(completed / orders.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {allComplete ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em]">
            🏅 Order Complete
          </p>

          <p className="mt-2 text-lg font-black">
            The Treasury commends thy diligence.
          </p>

          <p className="mt-1 text-sm font-bold">
            {savingReward
              ? "Recording thy reputation..."
              : rewardMessage || "Reputation shall rise throughout the colony."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
