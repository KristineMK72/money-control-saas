"use client";

import { useMemo, useState } from "react";
import { awardReputation } from "@/lib/reputation/awardReputation";

type Order = {
  id: number;
  text: string;
  complete: boolean;
};

type GovernorsOrdersProps = {
  onReward?: (amount: number) => void;
};

const REWARD_AMOUNT = 75;

const BEN_IMAGES = {
  thinking: "/ben-thinking.png",
  mastermind: "/ben-mastermind.png",
  recovery: "/ben-recovery.png",
  goal: "/ben-goal-achieved.png",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function GovernorsOrders({ onReward }: GovernorsOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([
    { id: 1, text: "Review one debt", complete: false },
    { id: 2, text: "Inspect upcoming obligations", complete: false },
    { id: 3, text: "Record one payment", complete: false },
  ]);

  const [rewardGiven, setRewardGiven] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [rewardMessage, setRewardMessage] = useState("");

  const completed = orders.filter((order) => order.complete).length;
  const allComplete = completed === orders.length;

  const benImage = useMemo(() => {
    if (allComplete) return BEN_IMAGES.goal;
    if (completed === 2) return BEN_IMAGES.recovery;
    if (completed === 1) return BEN_IMAGES.mastermind;
    return BEN_IMAGES.thinking;
  }, [allComplete, completed]);

  async function giveReward() {
    if (rewardGiven || savingReward) return;

    setSavingReward(true);
    setRewardMessage("Recording thy reputation...");

    const result = await awardReputation({
      eventType: "daily_orders_complete",
      amount: REWARD_AMOUNT,
      reason: "Completed Governor's Orders",
      eventKey: `daily_orders_complete_${todayKey()}`,
    });

    setSavingReward(false);

    if (result.awarded) {
      setRewardGiven(true);
      onReward?.(REWARD_AMOUNT);
      setRewardMessage(`The Treasury recorded thy reward: +${REWARD_AMOUNT} Reputation.`);
      return;
    }

    if (result.message === "Already rewarded.") {
      setRewardGiven(true);
      setRewardMessage("The Treasury already rewarded today's orders.");
      return;
    }

    setRewardMessage(result.message);
  }

  function toggleOrder(id: number) {
    if (rewardGiven || savingReward) return;

    const nextOrders = orders.map((order) =>
      order.id === id ? { ...order, complete: !order.complete } : order
    );

    setOrders(nextOrders);

    if (nextOrders.every((order) => order.complete)) {
      void giveReward();
    }
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/95 p-5 text-zinc-950 shadow-2xl md:p-6">
      <div className="flex gap-4">
        <img
          src={benImage}
          alt="Ben Franklin"
          className="h-24 w-24 rounded-2xl border border-amber-200 bg-white object-contain p-2 shadow-md"
        />

        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            📯 Daily Dispatch
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950">
            Governor&apos;s Orders
          </h2>

          <p className="mt-2 text-sm font-bold leading-6 text-zinc-700">
            {allComplete
              ? "Outstanding, Governor. The Treasury celebrates thy achievement."
              : "Good morrow, Governor. The Treasury awaits thy guidance."}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {orders.map((order) => (
          <label
            key={order.id}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-black text-zinc-900"
          >
            <input
              type="checkbox"
              checked={order.complete}
              disabled={rewardGiven || savingReward}
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
          <span>{completed}/{orders.length}</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(completed / orders.length) * 100}%` }}
          />
        </div>
      </div>

      {allComplete && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <p className="text-sm font-black uppercase tracking-[0.18em]">
            🏅 Order Complete
          </p>
          <p className="mt-2 text-lg font-black">
            The Treasury commends thy diligence.
          </p>
          <p className="mt-1 text-sm font-bold">
            {rewardMessage || "Reputation shall rise throughout the colony."}
          </p>
        </div>
      )}
    </section>
  );
}
