"use client";

import type { ReactNode } from "react";

type Tone = "emerald" | "amber" | "rose" | "sky" | "zinc";

const toneClass: Record<Tone, string> = {
  emerald: "border-emerald-200/90 bg-emerald-50/95 text-emerald-950",
  amber: "border-amber-200/90 bg-amber-50/95 text-amber-950",
  rose: "border-rose-200/90 bg-rose-50/95 text-rose-950",
  sky: "border-sky-200/90 bg-sky-50/95 text-sky-950",
  zinc: "border-zinc-200/90 bg-zinc-50/95 text-zinc-950",
};

export function AppShell({
  children,
  max = "max-w-6xl",
}: {
  children: ReactNode;
  max?: string;
}) {
  return (
    <main className="min-h-screen bg-transparent px-4 py-6 text-zinc-950 md:px-6">
      <div
        className={`mx-auto ${max} space-y-6 rounded-2xl border border-white/40 bg-zinc-950/70 p-4 shadow-2xl backdrop-blur-xl md:p-6`}
      >
        {children}
      </div>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="rounded-2xl border border-white/80 bg-white/95 p-6 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-zinc-700 md:text-base">
            {subtitle}
          </p>
        </div>
        {action}
      </div>
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/80 bg-white/95 p-5 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function DarkPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/20 bg-zinc-950/80 p-5 text-white shadow-2xl shadow-zinc-950/20 backdrop-blur-xl md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  tone = "zinc",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border p-5 shadow-xl shadow-zinc-950/5 backdrop-blur ${toneClass[tone]}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-75">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black tracking-tight md:text-3xl">
        {value}
      </p>
      {helper && <p className="mt-2 text-sm font-semibold opacity-75">{helper}</p>}
    </div>
  );
}

export function DataCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-zinc-200/90 bg-white/95 p-4 text-zinc-950 shadow-sm shadow-zinc-950/5 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function Notice({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border p-4 text-sm font-bold ${toneClass[tone]}`}>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-zinc-300 bg-white/95 px-4 py-3 text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 font-black text-white shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55";

export const moneyButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55";
