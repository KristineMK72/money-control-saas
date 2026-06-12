"use client";

import { useState } from "react";

type Order = {
  id: number;
  text: string;
  complete: boolean;
};

export default function GovernorsOrders() {
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

  const completed = orders.filter((order) => order.complete).length;
  const allComplete = completed === orders.length;

  function toggleOrder(id: number) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, complete: !order.complete } : order
      )
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
            🏅 +75 Reputation
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {orders.map((order) => (
          <label
            key={order.id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm font-black transition ${
              order.complete
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-zinc-200 bg-white text-zinc-900 hover:bg-amber-100"
            }`}
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
            Reputation shall rise throughout the colony.
          </p>
        </div>
      ) : null}
    </section>
  );
}

