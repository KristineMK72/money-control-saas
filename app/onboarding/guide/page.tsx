"use client";

import Link from "next/link";

const steps = [
  { href: "/income", label: "Add your income" },
  { href: "/bills", label: "Add your bills" },
  { href: "/debt", label: "Add your debts" },
  { href: "/spend", label: "Add your spending" },
  { href: "/dashboard", label: "See your map" },
];

export default function OnboardingGuidePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Let’s get your numbers in.
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            These five steps give Ben enough signal to start making real recommendations.
          </p>
        </header>

        <ol className="space-y-3 text-sm">
          {steps.map((step, idx) => (
            <li
              key={step.href}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{idx + 1}.</span>
                <span>{step.label}</span>
              </div>
              <Link
                href={step.href}
                className="text-xs rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:bg-zinc-800 transition"
              >
                Go
              </Link>
            </li>
          ))}
        </ol>

        <p className="text-xs text-zinc-500 leading-relaxed">
          You don’t have to be perfect. Rough numbers are enough for Ben to start coaching.
        </p>
      </div>
    </main>
  );
}
