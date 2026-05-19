"use client";

import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/world", label: "BenWorld" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/spend", label: "Spend" },
  { href: "/income", label: "Income" },
  { href: "/income-plan", label: "Income Plan" },
  { href: "/bills", label: "Bills" },
  { href: "/debt", label: "Debt" },
  { href: "/payments", label: "Payments" },
  { href: "/forecast", label: "Forecast" },
  { href: "/calendar", label: "Calendar" },
  { href: "/credit-health", label: "Credit Health" },
  { href: "/credit-recovery", label: "Credit Recovery" },
  { href: "/crisis", label: "Crisis" },
  { href: "/dispute-letter", label: "Dispute Letter" },
  { href: "/goodwill-letter", label: "Goodwill Letter" },
  { href: "/chat", label: "Ask Ben" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-2xl border border-white/20 bg-black/50 px-4 py-3 text-2xl font-black text-white shadow-xl"
        aria-label="Open menu"
      >
        ☰
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full z-[9999] mt-3 rounded-3xl border border-white/20 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center text-sm font-black text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
