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
import ScrollRevealCard from "@/components/ScrollRevealCard";
import XpBar from "@/components/XpBar";
import { BenEngine } from "@/lib/ben/engine";
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO, daysUntil } from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SpendRow = {
  id: string;
  amount: number | string | null;
  category: string | null;
};

type BillRow = {
  id: string;
  name: string | null;
  kind?: string | null;
  category?: string | null;
  target?: number | string | null;
  monthly_target?: number | string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  due_date?: string | null;
  due?: string | null;
  due_day?: number | string | null;
  focus?: boolean | null;
};

type DebtRow = {
  id: string;
  name: string | null;
  kind?: string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  monthly_min_payment?: number | string | null;
  due_date?: string | null;
  due_day?: number | string | null;
  apr?: number | string | null;
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
  month?: string | null;
};

type ProfileRow = {
  xp?: number | null;
  level?: number | null;
  reputation?: number | null;
};

function getColonialRank(reputation: number) {
  if (reputation >= 5000) return "Defender of the Treasury";
  if (reputation >= 2500) return "Founding Financier";
  if (reputation >= 1000) return "Governor";
  if (reputation >= 500) return "Colonial Magistrate";
  if (reputation >= 250) return "Treasury Keeper";
  if (reputation >= 100) return "Town Recorder";
  return "Apprentice Clerk";
}

function billAmount(bill: BillRow) {
  return clampMoney(
    bill.target ?? bill.monthly_target ?? bill.balance ?? bill.min_payment
  );
}

function debtMinimum(debt: DebtRow) {
  return clampMoney(debt.monthly_min_payment ?? debt.min_payment);
}

function dueLabel(days: number | null) {
  if (days === null) return "No due date";
  if (days < 0) return `Overdue by ${Math.abs(days)} day(s)`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;
  return `Due in ${days} days`;
}

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [viewMode, setViewMode] = useState<"month" | "cumulative">("month");

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [billsRows, setBillsRows] = useState<BillRow[]>([]);
  const [debtRows, setDebtRows] = useState<DebtRow[]>([]);
  const [monthlyMaster, setMonthlyMaster] = useState<BenMasterRow | null>(null);
  const [cumulativeMaster, setCumulativeMaster] =
    useState<BenMasterRow | null>(null);
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

      const [
        spendRes,
        billsRes,
        debtsRes,
        monthlyRes,
        cumulativeRes,
        profileRes,
      ] = await Promise.all([
        supabase
          .from("spend_entries")
          .select("id, amount, category")
          .eq("user_id", uid),

        supabase
          .from("bills")
          .select(
            "id, name, kind, category, target, monthly_target, balance, min_payment, due_date, due, due_day, focus"
          )
          .eq("user_id", uid),

        supabase
          .from("debts")
          .select(
            "id, name, kind, balance, min_payment, monthly_min_payment, due_date, due_day, apr"
          )
          .eq("user_id", uid),

        supabase
          .from("ben_master_monthly")
          .select("*")
          .eq("user_id", uid)
          .gte("month", currentMonthStartISO())
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase.from("ben_master").select("*").eq("user_id", uid).maybeSingle(),

        supabase
          .from("profiles")
          .select("xp, level, reputation")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      if (spendRes.error) setNotice(spendRes.error.message);
      if (billsRes.error) setNotice(billsRes.error.message);
      if (debtsRes.error) setNotice(debtsRes.error.message);
      if (monthlyRes.error) setNotice(monthlyRes.error.message);
      if (cumulativeRes.error) setNotice(cumulativeRes.error.message);
      if (profileRes.error) setNotice(profileRes.error.message);

      setSpend((spendRes.data || []) as SpendRow[]);
      setBillsRows((billsRes.data || []) as BillRow[]);
      setDebtRows((debtsRes.data || []) as DebtRow[]);
      setMonthlyMaster((monthlyRes.data || null) as BenMasterRow | null);
      setCumulativeMaster((cumulativeRes.data || null) as BenMasterRow | null);
      setProfile((profileRes.data || null) as ProfileRow | null);

      if (!monthlyRes.data && !cumulativeRes.data) {
        setNotice(
          "Add income, bills, spending, or payments to wake up the full picture."
        );
      }

      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  const master =
    viewMode === "month"
      ? monthlyMaster ?? cumulativeMaster
      : cumulativeMaster ?? monthlyMaster;

  const totalIncome = clampMoney(master?.total_income);
  const totalSpend = clampMoney(master?.total_spend);
  const bills = clampMoney(master?.bills ?? master?.total_bills);
  const totalDebt = clampMoney(master?.total_debt);
  const totalDebtMinimums = clampMoney(master?.total_debt_minimums);
  const payments = clampMoney(master?.payments);
  const net = clampMoney(master?.leftover);
  const pressurePct = clampMoney(master?.pressure_pct);
  const totalObligations = totalSpend + bills + totalDebtMinimums;
  const incomeGap = Math.max(0, totalObligations - totalIncome);

  const reputation = profile?.reputation ?? 0;
  const rank = getColonialRank(reputation);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};

    spend.forEach((row) => {
      const cat = (row.category || "misc").replaceAll("_", " ");
      totals[cat] = (totals[cat] || 0) + clampMoney(row.amount);
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [spend]);

  const priorityItems = useMemo<PriorityInput[]>(() => {
    return [
      ...billsRows.map((bill) => ({
        id: bill.id,
        type: "bill" as const,
        name: bill.name,
        amount: billAmount(bill),
        due_date: bill.due_date,
        due: bill.due,
        due_day: bill.due_day,
        category: bill.category,
        kind: bill.kind,
        focus: bill.focus,
      })),
      ...debtRows.map((debt) => ({
        id: debt.id,
        type: "debt" as const,
        name: debt.name,
        amount: debtMinimum(debt),
        balance: debt.balance,
        due_date: debt.due_date,
        due_day: debt.due_day,
        kind: debt.kind,
        apr: debt.apr,
      })),
    ];
  }, [billsRows, debtRows]);

  const topPriorities = useMemo(() => {
    return prioritizeMoneyItems(priorityItems).slice(0, 5);
  }, [priorityItems]);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: viewMode === "month" ? "This Month" : "Cumulative",
    totalNeeded: totalObligations,
    incomeSoFar: totalIncome,
    incomeGap,
    dailyIncomeNeeded: incomeGap > 0 ? Math.ceil(incomeGap / 30) : 0,
  });

  const priorityBenText =
    topPriorities.length > 0
      ? `Good Governor, thy first concern appears to be ${
          topPriorities[0].item.name ?? "an unnamed item"
        } for ${money(topPriorities[0].amount)}. Reason: ${topPriorities[0].reasons.join(
          ", "
        )}.`
      : ben.text;

  const pressureMood =
    incomeGap > 0 || net < 0 || pressurePct > 75
      ? "/ben-overdraft.png"
      : "/ben-recovery.png";

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
        title="Governor&apos;s Office"
        subtitle="Good morrow, Governor. The Treasury awaits thy guidance."
        action={
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-right shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Reputation
            </p>
            <p className="text-4xl font-black text-emerald-950">
              {reputation}
            </p>
            <p className="mt-1 text-xs font-black text-emerald-800">{rank}</p>
          </div>
        }
      />

      {notice ? <Notice>{notice}</Notice> : null}

      <ScrollRevealCard
        title="Ben's Desk"
        subtitle="Guidance, XP, and today's command briefing"
        image="/ben-head.png"
        defaultOpen
      >
        <DarkPanel>
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <BenBubble message={priorityBenText} mood={ben.mood} />

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

        <div className="mt-5">
          <GovernorsOrders />
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Priority Engine"
        subtitle="The same trusted ranking Ben uses in chat"
        image="/ben-mastermind.png"
        defaultOpen
      >
        <div className="grid gap-3">
          {topPriorities.length > 0 ? (
            topPriorities.map((row, index) => (
              <div
                key={`${row.item.type}-${row.item.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                      #{index + 1} {row.item.type}
                    </p>

                    <h3 className="mt-1 text-xl font-black text-zinc-950">
                      {row.item.name ?? "Unnamed"}
                    </h3>

                    <p className="mt-1 text-sm font-bold text-zinc-600">
                      {dueLabel(row.daysUntilDue)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-2xl font-black text-zinc-950">
                      {money(row.amount)}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                      Score {row.score}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Panel>No bills or debts found for priority ranking yet.</Panel>
          )}
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Treasury Snapshot"
        subtitle={`Viewing ${
          viewMode === "month" ? "this month" : "cumulative"
        } totals`}
        image="/ben-thinking.png"
        defaultOpen
      >
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-zinc-950">
              Treasury Snapshot
            </h2>
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
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Obligations Ledger"
        subtitle="Bills, debt minimums, and payments made"
        image={pressureMood}
      >
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
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Pressure & Warnings"
        subtitle="Income gap, pressure level, and spending pattern"
        image={pressureMood}
      >
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
      </ScrollRevealCard>
    </AppShell>
  );
}
