```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  DarkPanel,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
} from "@/components/AppFrame";
import BenBubble from "@/components/BenBubble";
import GovernorsOrders from "@/components/GovernorsOrders";
import XpBar from "@/components/XpBar";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SpendRow = {
  id: string;
  amount: number | string | null;
  category: string | null;
};

type BenMasterRow = {
  user_id: string;
  total_income?: number | string | null;
  total_spend?: number | string | null;
  bills?: number | string | null;
  total_bills?: number | string | null;
  total_debt?: number | string | null;
  total_debt_minimums?: number | string | null;
  payments?: number | string | null;
  leftover?: number | string | null;
  pressure_pct?: number | string | null;
  month_start?: string | null;
};

type ProfileRow = {
  xp?: number | null;
  level?: number | null;
  reputation?: number | null;
};

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function getColonialRank(reputation: number) {
  if (reputation >= 5000) return "Defender of the Treasury";
  if (reputation >= 2500) return "Founding Financier";
  if (reputation >= 1000) return "Governor";
  if (reputation >= 500) return "Colonial Magistrate";
  if (reputation >= 250) return "Treasury Keeper";
  if (reputation >= 100) return "Town Recorder";
  return "Apprentice Clerk";
}

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [viewMode, setViewMode] = useState<"month" | "cumulative">("month");

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [cumulativeMaster, setCumulativeMaster] = useState<BenMasterRow | null>(
    null
  );
  const [monthlyMaster, setMonthlyMaster] = useState<BenMasterRow | null>(null);
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

      if (sessionError || !session?.user) {
        setNotice("Sign in to see your dashboard.");
        setLoading(false);
        return;
      }

      const uid = session.user.id;

      const [spendRes, cumulativeRes, monthlyRes, profileRes] =
        await Promise.all([
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
            .from("ben_master_monthly")
            .select("*")
            .eq("user_id", uid)
            .order("month_start", { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from("profiles")
            .select("xp, level, reputation")
            .eq("user_id", uid)
            .maybeSingle(),
        ]);

      if (spendRes.error) setNotice(spendRes.error.message);
      if (cumulativeRes.error) setNotice(cumulativeRes.error.message);
      if (monthlyRes.error) {
        console.warn("Monthly dashboard view unavailable:", monthlyRes.error);
      }
      if (profileRes.error) setNotice(profileRes.error.message);

      setSpend((spendRes.data || []) as SpendRow[]);
      setCumulativeMaster((cumulativeRes.data || null) as BenMasterRow | null);
      setMonthlyMaster((monthlyRes.data || null) as BenMasterRow | null);
      setProfile((profileRes.data || null) as ProfileRow | null);

      if (!cumulativeRes.data) {
        setNotice("Add income, bills, or spending to wake up the full picture.");
      }

      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  const master =
    viewMode === "month"
      ? monthlyMaster ?? cumulativeMaster
      : cumulativeMaster ?? monthlyMaster;

  const totalIncome = num(master?.total_income);
  const totalSpend = num(master?.total_spend);
  const bills = num(master?.bills ?? master?.total_bills);
  const totalDebt = num(master?.total_debt);
  const totalDebtMinimums = num(master?.total_debt_minimums);
  const payments = num(master?.payments);
  const net = num(master?.leftover);
  const pressurePct = num(master?.pressure_pct);
  const totalObligations = totalSpend + bills + totalDebtMinimums;
  const incomeGap = Math.max(0, totalObligations - totalIncome);

  const reputation = profile?.reputation ?? 0;
  const rank = getColonialRank(reputation);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};

    spend.forEach((row) => {
      const cat = (row.category || "misc").replaceAll("_", " ");
      totals[cat] = (totals[cat] || 0) + num(row.amount);
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [spend]);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: viewMode === "month" ? "This Month" : "Cumulative",
    totalNeeded: totalObligations,
    incomeSoFar: totalIncome,
    incomeGap,
    dailyIncomeNeeded: incomeGap > 0 ? Math.ceil(incomeGap / 30) : 0,
  });

  if (loading) {
    return (
      <AppShell>
        <Panel>Loading your AskBen dashboard...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="AskBen Command Center"
        title="Governor's Office"
        subtitle="Good morrow, Governor. The Treasury awaits thy guidance."
        action={
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-right shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Reputation
            </p>
            <p className="text-4xl font-black text-emerald-950">{reputation}</p>
            <p className="mt-1 text-xs font-black text-emerald-800">{rank}</p>
          </div>
        }
      />

      {notice ? <Notice>{notice}</Notice> : null}

      <DarkPanel>
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <BenBubble message={ben.text} mood={ben.mood} />

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
              Ben XP
            </p>

            <div className="mt-3">
              <XpBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />
            </div>
          </div>
        </div>
      </DarkPanel>

      <GovernorsOrders />

      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Treasury Snapshot</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-600">
              Viewing: {viewMode === "month" ? "This Month" : "Cumulative"}
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
            {(["month", "cumulative"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={
                  viewMode === mode
                    ? "rounded-xl bg-zinc-950 px-4 py-2 text-sm font-black capitalize text-white shadow transition"
                    : "rounded-xl px-4 py-2 text-sm font-black capitalize text-zinc-600 transition hover:text-zinc-950"
                }
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Income" value={money(totalIncome)} tone="emerald" />
        <MetricCard label="Spend" value={money(totalSpend)} tone="amber" />
        <MetricCard label="Debt" value={money(totalDebt)} tone="rose" />
        <MetricCard
          label="Net"
          value={money(net)}
          tone={net >= 0 ? "emerald" : "rose"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Bills"
          value={money(bills)}
          helper="Bill targets this period"
          tone="sky"
        />

        <MetricCard
          label="Debt minimums"
          value={money(totalDebtMinimums)}
          helper="Required payments"
          tone="amber"
        />

        <MetricCard
          label="Payments made"
          value={money(payments)}
          helper="Actual payments recorded"
          tone="emerald"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Top spending"
          value={topCategory ? topCategory[0] : "None yet"}
          helper={topCategory ? money(topCategory[1]) : "No spending logged"}
          tone="zinc"
        />

        <MetricCard
          label="Income gap"
          value={money(incomeGap)}
          helper="Extra income needed to stay on track"
          tone={incomeGap > 0 ? "rose" : "emerald"}
        />

        <MetricCard
          label="Pressure"
          value={pressurePct ? `${pressurePct.toFixed(1)}%` : "None yet"}
          helper="Debt pressure vs income"
          tone={pressurePct > 50 ? "rose" : "sky"}
        />
      </section>
    </AppShell>
  );
}
```
