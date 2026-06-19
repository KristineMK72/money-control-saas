"use client";

import Link from "next/link";
import { useState } from "react";

export default function TreasuryCoinMenu() {
  const [open, setOpen] = useState(false);

  const items = [
    { label: "Add Payment", href: "/payments", icon: "💸" },
    { label: "Add Income", href: "/income", icon: "💰" },
    { label: "Add Spend", href: "/spend", icon: "🧾" },
    { label: "Add Debt", href: "/debt", icon: "🏦" },
    { label: "Add Bill", href: "/bills", icon: "📅" },
    { label: "Big Picture", href: "/dashboard", icon: "🗺️" },
    { label: "Forecast", href: "/forecast", icon: "🔮" },
    { label: "Credit Health", href: "/credit", icon: "🏛️" },
  ];

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="grid gap-2 rounded-3xl border border-amber-300 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-zinc-900 shadow"
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="treasury-coin"
        aria-label="Open Treasury"
      >
        🪙
        <span className="sparkle sparkle-1">✨</span>
        <span className="sparkle sparkle-2">✨</span>
        <span className="sparkle sparkle-3">✨</span>
      </button>
    </div>
  );
}
