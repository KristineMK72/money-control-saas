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
  date?: string;
  total_income?: number | string | null;
  total_spend?: number | string | null;
  bills?: number | string | null;
  total_bills?: number | string | null;
  total_debt?: number | string | null;
  total_debt_minimums?: number | string | null;
  payments?: number | string | null;
  leftover?: number | string | null;
  pressure_pct?: number | string | null;
};

type ProfileRow = {
  xp?: number | null;
  level?: number | null;
};

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatUSD(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

// Improved readability
const cardClass = 
  "rounded-2xl border border-white/60 bg-white/96 p-6 shadow-2xl backdrop-blur-lg transition hover:-translate-y-0.5 hover:bg-white/98";

const sectionClass = 
  "rounded-[2rem] border border-white/20 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-md md:p-6";

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [viewMode, setViewMode] = useState<"month" | "cumulative">("month");

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [master, setMaster] = useState<BenMasterRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setNotice("");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        setNotice("Please sign in to view your dashboard.");
        setLoading(false);
        return;
      }

      const uid = session.user.id;

      const [spendRes, masterRes, profileRes] = await Promise.all([
        supabase.from("spend_entries").select("id, amount, category").eq("user_id", uid),
        supabase.from("ben_master").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("profiles").select("xp, level").eq("user_id", uid).maybeSingle(),
      ]);

      setSpend((spendRes.data || []) as SpendRow[]);
      setMaster((masterRes.data || null) as BenMasterRow | null);
      setProfile((profileRes.data || null) as ProfileRow | null);

      setNotice(!masterRes.data ? "Add income, bills, or spending to see your full picture." : "");
      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  // === IMPROVED MATH ===
  const totalIncome = num(master?.total_income);
  const totalSpend = num(master?.total_spend);
  const bills = num(master?.bills ?? master?.total_bills);
  const totalDebt = num(master?.total_debt);
  const totalDebtMinimums = num(master?.total_debt_minimums);
  const payments = num(master?.payments);
  const net = num(master?.leftover);
  const pressurePct = num(master?.pressure_pct);

  const totalObligations = totalSpend + bills + totalDebtMinimums; // More accurate obligations
  const incomeGap = Math.max(0, totalObligations - totalIncome);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    spend.forEach((row) => {
      const cat = (row.category || "misc").toLowerCase();
      totals[cat] = (totals[cat] || 0) + num(row.amount);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [spend]);

  // Ben Insights via OpenAI / Engine
  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: viewMode === "month" ? "This Month" : "Overall",
    totalNeeded: totalObligations,
    incomeSoFar: totalIncome,
    incomeGap,
    dailyIncomeNeeded: incomeGap > 0 ? Math.ceil(incomeGap / 30) : 0,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-4 md:p-6">
        <div className={`${sectionClass} mx-auto max-w-6xl`}>
          <div className="rounded-2xl bg-white/95 p-8 text-center font-bold text-zinc-900 shadow-xl">
            Loading your AskBen dashboard...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${sectionClass} mx-auto max-w-6xl`}>
        {/* Header */}
        <header className="rounded-[1.5rem] border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">AskBen Command Center</p>
              <h1 className="mt-1 text-3xl font-black text-zinc-950 md:text-4xl">Dashboard</h1>
              <p className="mt-2 text-sm font-medium text-zinc-700">Real-time financial triage with judgment.</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-right shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Level</p>
              <p className="text-3xl font-black text-emerald-950">{profile?.level ?? 1}</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="mt-6 flex gap-2 border border-white/30 bg-white/60 rounded-2xl p-1 w-fit">
            <button
              onClick={() => setViewMode("month")}
              className={`px-6 py-2.5 rounded-xl font-medium transition ${viewMode === "month" ? "bg-zinc-900 text-white shadow" : "text-zinc-700 hover:bg-white"}`}
            >
              This Month
            </button>
            <button
              onClick={() => setViewMode("cumulative")}
              className={`px-6 py-2.5 rounded-xl font-medium transition ${viewMode === "cumulative" ? "bg-zinc-900 text-white shadow" : "text-zinc-700 hover:bg-white"}`}
            >
              Cumulative
            </button>
          </div>

          {/* Ben Insight */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl">
            <BenBubble message={ben.text} mood={ben.mood} />
          </div>

          <div className="mt-6">
            <XpBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />
          </div>
        </header>

        {/* Main Metrics */}
        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <MoneyCard label="Income" value={formatUSD(totalIncome)} tone="good" />
          <MoneyCard label="Spend" value={formatUSD(totalSpend)} tone="warn" />
          <MoneyCard label="Debt" value={formatUSD(totalDebt)} tone="danger" />
          <MoneyCard label="Net" value={formatUSD(net)} tone={net >= 0 ? "good" : "danger"} />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard title="Bills" value={formatUSD(bills)} text="Total bill targets this period" />
          <InfoCard title="Debt Minimums" value={formatUSD(totalDebtMinimums)} text="Required payments this period" />
          <InfoCard title="Payments Made" value={formatUSD(payments)} text="Actual payments recorded" />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Top Spending"
            value={topCategory?.[0] || "—"}
            text={topCategory ? `${formatUSD(topCategory[1])} this period` : "No spending yet"}
          />
          <InfoCard title="Income Gap" value={formatUSD(incomeGap)} text="Extra income needed to stay on track" />
          <InfoCard title="Pressure" value={pressurePct ? `${pressurePct.toFixed(1)}%` : "—"} text="Debt pressure vs income" />
        </section>

        {notice && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            {notice}
          </div>
        )}
      </div>
    </main>
  );
}

/* ==================== Reusable Cards ==================== */
function MoneyCard({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "danger" }) {
  const toneClass = tone === "good" 
    ? "from-emerald-50 to-white border-emerald-200" 
    : tone === "warn" 
      ? "from-amber-50 to-white border-amber-200" 
      : "from-rose-50 to-white border-rose-200";

  return (
    <div className={`${cardClass} bg-gradient-to-br ${toneClass}`}>
      <div className="text-sm font-black uppercase tracking-widest text-zinc-700">{label}</div>
      <div className="mt-4 text-4xl font-black text-zinc-950 tracking-tight">{value}</div>
    </div>
  );
}

function InfoCard({ title, value, text }: { title: string; value: string; text: string }) {
  return (
    <div className={cardClass}>
      <h3 className="text-sm font-black uppercase tracking-widest text-zinc-700">{title}</h3>
      <p className="mt-4 text-4xl font-black text-zinc-950 tracking-tight">{value}</p>
      <p className="mt-5 text-sm leading-relaxed text-zinc-600">{text}</p>
    </div>
  );
}
