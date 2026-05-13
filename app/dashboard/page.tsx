"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import BenBubble from "@/components/BenBubble";
import XpBar from "@/components/XpBar";

type SpendRow = {
  id: string;
  amount: number | string | null;
  category: string | null;
};

type BenMasterRow = {
  user_id: string;
  date: string;
  income?: number | string | null;
  spend?: number | string | null;
  bills?: number | string | null;
  payments?: number | string | null;
  leftover?: number | string | null;
  pressure_pct?: number | string | null;
  total_debt?: number | string | null;
  monthly_minimums?: number | string | null;
  total_income?: number | string | null;
  total_spend?: number | string | null;
  total_debt_balance?: number | string | null;
  total_debt_minimums?: number | string | null;
  net?: number | string | null;
};

type ProfileRow = {
  xp?: number | null;
  level?: number | null;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatUSD(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const cardClass =
  "rounded-2xl border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white";

const sectionClass =
  "rounded-[2rem] border border-white/25 bg-slate-950/55 p-4 shadow-2xl backdrop-blur-sm md:p-6";

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [master, setMaster] = useState<BenMasterRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setNotice("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setNotice(`Session error: ${sessionError.message}`);
        setLoading(false);
        return;
      }

      const user = session?.user;

      if (!user) {
        setNotice("Connecting to your financial snapshot...");
        setLoading(false);
        return;
      }

      const uid = user.id;

      const [spendRes, masterRes, profileRes] = await Promise.all([
        supabase
          .from("spend_entries")
          .select("id, amount, category")
          .eq("user_id", uid),

        supabase
          .from("ben_master")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select("xp, level")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      if (spendRes.error) {
        console.error("Dashboard spend_entries error:", spendRes.error);
      }

      if (masterRes.error) {
        console.error("Dashboard ben_master error:", masterRes.error);
      }

      if (profileRes.error) {
        console.error("Dashboard profiles error:", profileRes.error);
      }

      setSpend((spendRes.data || []) as SpendRow[]);
      setMaster((masterRes.data || null) as BenMasterRow | null);
      setProfile((profileRes.data || null) as ProfileRow | null);

      const messages = [
        spendRes.error ? `Spend error: ${spendRes.error.message}` : "",
        masterRes.error ? `Ben master error: ${masterRes.error.message}` : "",
        profileRes.error ? `Profile error: ${profileRes.error.message}` : "",
        !masterRes.data ? "No Ben master row returned yet." : "",
      ].filter(Boolean);

      setNotice(messages.join(" "));
      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  const totalIncome = num(master?.total_income ?? master?.income);
  const totalSpend = num(master?.total_spend ?? master?.spend);
  const totalDebtBalance = num(master?.total_debt_balance ?? master?.total_debt);
  const totalDebtMinimums = num(
    master?.total_debt_minimums ?? master?.monthly_minimums
  );
  const net = num(master?.net ?? master?.leftover);
  const bills = num(master?.bills);
  const payments = num(master?.payments);
  const pressurePct = num(master?.pressure_pct);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const row of spend) {
      const category = row.category || "misc";
      totals[category] = (totals[category] || 0) + num(row.amount);
    }

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [spend]);

  const topCategoryName = topCategory?.[0] || "—";
  const topCategoryAmount = topCategory?.[1] || 0;

  const totalObligations = totalSpend + totalDebtMinimums;
  const incomeGap = Math.max(0, totalObligations - totalIncome);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Dashboard",
    totalNeeded: totalObligations,
    incomeSoFar: totalIncome,
    incomeGap,
    dailyIncomeNeeded: 0,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-4 md:p-6">
        <div className={`${sectionClass} mx-auto max-w-6xl`}>
          <div className="rounded-2xl bg-white/95 p-6 font-bold text-zinc-900 shadow-xl">
            Loading your AskBen dashboard...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${sectionClass} mx-auto max-w-6xl`}>
        <header className="rounded-[1.5rem] border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur-md md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
                AskBen Command Center
              </p>
              <h1 className="mt-1 text-3xl font-black text-zinc-950 md:text-4xl">
                Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-700">
                Your live money snapshot, pressure check, XP progress, and Ben’s
                latest judgment.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Level
              </p>
              <p className="text-3xl font-black text-emerald-950">
                {profile?.level ?? 1}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl">
            <BenBubble message={ben.text} mood={ben.mood} />
          </div>

          <div className="mt-5">
            <XpBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />
          </div>

          {notice && (
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 shadow-sm">
              {notice}
            </div>
          )}
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <MoneyCard label="Income" value={formatUSD(totalIncome)} tone="good" />
          <MoneyCard label="Spend" value={formatUSD(totalSpend)} tone="warn" />
          <MoneyCard label="Debt" value={formatUSD(totalDebtBalance)} tone="danger" />
          <MoneyCard label="Net" value={formatUSD(net)} tone={net >= 0 ? "good" : "danger"} />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Bills"
            value={formatUSD(bills)}
            text="Monthly bills from your Ben master summary."
          />

          <InfoCard
            title="Debt minimums"
            value={formatUSD(totalDebtMinimums)}
            text="Minimum payments currently pressuring your monthly cashflow."
          />

          <InfoCard
            title="Payments"
            value={formatUSD(payments)}
            text="Payments tracked this month."
          />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Top spending category"
            value={topCategoryName}
            text={
              topCategory
                ? `${formatUSD(topCategoryAmount)} tracked in this category.`
                : "No spend categories loaded yet."
            }
          />

          <InfoCard
            title="Income gap"
            value={formatUSD(incomeGap)}
            text="How much more income is needed to cover spend plus debt minimums."
          />

          <InfoCard
            title="Pressure"
            value={pressurePct ? `${pressurePct.toFixed(1)}%` : "—"}
            text="Debt minimum pressure compared with current month income."
          />
        </section>

        <section className="mt-6 rounded-2xl border border-white/60 bg-white/90 p-5 text-sm font-medium text-zinc-800 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap gap-4">
            <div>Spend lines loaded: {spend.length}</div>
            <div>Ben master row: {master ? "loaded" : "missing"}</div>
            <div>Obligations: {formatUSD(totalObligations)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MoneyCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "danger";
}) {
  const toneClass =
    tone === "good"
      ? "from-emerald-50 to-white border-emerald-200"
      : tone === "warn"
        ? "from-amber-50 to-white border-amber-200"
        : "from-rose-50 to-white border-rose-200";

  return (
    <div className={`${cardClass} bg-gradient-to-br ${toneClass}`}>
      <div className="text-sm font-black uppercase tracking-wide text-zinc-700">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  text,
}: {
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className={cardClass}>
      <h2 className="text-sm font-black uppercase tracking-wide text-zinc-700">
        {title}
      </h2>
      <p className="mt-2 text-3xl font-black text-zinc-950">{value}</p>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-800">
        {text}
      </p>
    </div>
  );
}
