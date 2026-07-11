"use client";

import Link from "next/link";

const cards = [
  {
    href: "/credit-health",
    title: "Credit Health",
    description: "Review credit utilization, balances, and overall credit progress.",
  },
  {
    href: "/credit-recovery",
    title: "Recovery Plan",
    description: "Build a strategy to reduce debt and improve your credit position.",
  },
  {
    href: "/dispute-letter",
    title: "Dispute Letter",
    description: "Create a credit dispute letter for inaccurate information.",
  },
  {
    href: "/goodwill-letter",
    title: "Goodwill Letter",
    description: "Generate a goodwill request letter for past payment issues.",
  },
];

export default function CreditPage() {
  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/40 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <header className="mb-8">
          <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            AskBen Credit Center
          </div>

          <h1 className="mt-4 text-5xl font-black text-white">
            Credit Center
          </h1>

          <p className="mt-2 text-lg font-semibold text-white/90">
            Credit health, recovery planning, dispute letters, and goodwill letters in one place.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white transition hover:bg-white/20"
            >
              <h2 className="text-2xl font-black">
                {card.title}
              </h2>

              <p className="mt-2 text-white/80">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
