"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  DarkPanel,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  inputClass,
  moneyButtonClass,
} from "@/components/AppFrame";
import BenBubble from "@/components/BenBubble";
import ScrollRevealCard from "@/components/ScrollRevealCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
  credit_limit: number | null;
  apr: number | null;
  created_at?: string;
};

function formatUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function pct(n: number) {
  return `${Number(n || 0).toFixed(0)}%`;
}

function monthsToTarget(
  balance: number,
  limit: number,
  targetPct: number,
  monthlyPay: number
) {
  if (limit <= 0) return null;

  const targetBalance = limit * (targetPct / 100);
  if (balance <= targetBalance) return 0;
  if (monthlyPay <= 0) return null;

  return Math.ceil((balance - targetBalance) / monthlyPay);
}

export default function CreditRecoveryPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [extraPayment, setExtraPayment] = useState("100");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setMessage("Please log in to view your credit recovery plan.");
        setLoading(false);
        return;
      }

      const [profileRes, debtsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      if (profileRes.data?.display_name) setName(profileRes.data.display_name);

      if (debtsRes.error) {
        setMessage(debtsRes.error.message);
      } else {
        setDebts((debtsRes.data || []) as DebtRow[]);
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const creditCards = useMemo(
    () => debts.filter((d) => d.kind === "credit"),
    [debts]
  );

  const totals = useMemo(() => {
    const totalCreditDebt = creditCards.reduce(
      (sum, d) => sum + Number(d.balance || 0),
      0
    );

    const totalCreditLimit = creditCards.reduce(
      (sum, d) => sum + Number(d.credit_limit || 0),
      0
    );

    const totalMinimums = creditCards.reduce(
      (sum, d) => sum + Number(d.monthly_min_payment || d.min_payment || 0),
      0
    );

    const utilization =
      totalCreditLimit > 0 ? (totalCreditDebt / totalCreditLimit) * 100 : 0;

    return {
      totalCreditDebt,
      totalCreditLimit,
      totalMinimums,
      utilization,
    };
  }, [creditCards]);

  const monthlyExtra = Number(extraPayment) || 0;
  const totalMonthlyAttack = totals.totalMinimums + monthlyExtra;

  const milestones = useMemo(() => {
    return [
      {
        label: "Under 75%",
        target: 75,
        months: monthsToTarget(
          totals.totalCreditDebt,
          totals.totalCreditLimit,
          75,
          totalMonthlyAttack
        ),
      },
      {
        label: "Under 50%",
        target: 50,
        months: monthsToTarget(
          totals.totalCreditDebt,
          totals.totalCreditLimit,
          50,
          totalMonthlyAttack
        ),
      },
      {
        label: "Under 30%",
        target: 30,
        months: monthsToTarget(
          totals.totalCreditDebt,
          totals.totalCreditLimit,
          30,
          totalMonthlyAttack
        ),
      },
      {
        label: "Under 10%",
        target: 10,
        months: monthsToTarget(
          totals.totalCreditDebt,
          totals.totalCreditLimit,
          10,
          totalMonthlyAttack
        ),
      },
    ];
  }, [totals, totalMonthlyAttack]);

  const prioritizedCards = useMemo(() => {
    return creditCards
      .map((card) => {
        const limit = Number(card.credit_limit || 0);
        const balance = Number(card.balance || 0);
        const util = limit > 0 ? (balance / limit) * 100 : 0;

        return {
          ...card,
          util,
        };
      })
      .sort((a, b) => {
        if (b.util !== a.util) return b.util - a.util;
        return Number(b.apr || 0) - Number(a.apr || 0);
      });
  }, [creditCards]);

  const benMessage = useMemo(() => {
    if (totals.totalCreditLimit <= 0) {
      return "Add your credit card limits first so I can build a real recovery plan.";
    }

    if (totalMonthlyAttack <= 0) {
      return "Even a small extra monthly payment gives me something to work with.";
    }

    const under50 = milestones.find((m) => m.target === 50)?.months;

    if (under50 === 0) {
      return `${name || "Friend"}, you are already under 50%. Now let’s chase 30%.`;
    }

    if (under50 != null) {
      return `${name || "Friend"}, if you put ${formatUSD(
        totalMonthlyAttack
      )} toward credit each month, you could get under 50% utilization in ${under50} month${
        under50 === 1 ? "" : "s"
      }.`;
    }

    return "Start with the highest-utilization card first.";
  }, [totals, totalMonthlyAttack, milestones, name]);

  const recoveryMood =
    totals.utilization >= 75
      ? "/ben-overdraft.png"
      : totals.utilization >= 50
      ? "/ben-facepalm.png"
      : totals.utilization >= 30
      ? "/ben-mastermind.png"
      : "/ben-winning.png";

  if (loading) {
    return (
      <AppShell max="max-w-6xl">
        <Panel>Loading credit recovery plan...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell max="max-w-6xl">
      <PageHeader
        eyebrow="Credit Recovery Planner"
        title={name ? `${name}'s Recovery Plan` : "Credit Recovery Plan"}
        subtitle="See how fast you can lower utilization and reduce credit pressure."
        action={
          <div className="flex flex-wrap gap-2">
            <a href="/credit-health" className={moneyButtonClass}>
              Credit Health
            </a>
            <a href="/payments" className={moneyButtonClass}>
              Add Payment
            </a>
          </div>
        }
      />

      {message ? <Notice>{message}</Notice> : null}

      <ScrollRevealCard
        title="Credit Recovery Briefing"
        subtitle="Utilization, credit limits, minimums, and Ben's strategy"
        image={recoveryMood}
        defaultOpen
      >
        <DarkPanel>
          <BenBubble
            message={benMessage}
            mood={prioritizedCards.some((card) => card.util >= 50) ? "stern" : "celebratory"}
          />
        </DarkPanel>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total credit debt"
            value={formatUSD(totals.totalCreditDebt)}
            tone="rose"
          />
          <MetricCard
            label="Total credit limit"
            value={formatUSD(totals.totalCreditLimit)}
            tone="sky"
          />
          <MetricCard
            label="Current utilization"
            value={pct(totals.utilization)}
            tone={totals.utilization >= 50 ? "rose" : "emerald"}
          />
          <MetricCard
            label="Monthly minimums"
            value={formatUSD(totals.totalMinimums)}
            helper="Base payment already required"
            tone="amber"
          />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Monthly Attack Plan"
        subtitle="Set your extra payment and see the timeline change"
        image="/ben-mastermind.png"
        defaultOpen
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-black text-zinc-700">
              Extra monthly payment
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={extraPayment}
              onChange={(e) => setExtraPayment(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Total monthly attack
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-950">
              {formatUSD(totalMonthlyAttack)}
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-800">
              Minimums + extra payment
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
          {benMessage}
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Recovery Milestones"
        subtitle="How long until your utilization reaches healthier zones"
        image="/ben-recovery.png"
        defaultOpen
      >
        <div className="grid gap-3">
          {milestones.map((m) => (
            <div
              key={m.label}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-black text-zinc-950">{m.label}</p>
                <p className="text-sm font-semibold text-zinc-600">
                  Target utilization: {m.target}%
                </p>
              </div>

              <p className="text-right font-black text-zinc-950">
                {m.months == null
                  ? "—"
                  : m.months === 0
                  ? "Already there"
                  : `${m.months} mo`}
              </p>
            </div>
          ))}
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Cards To Focus On First"
        subtitle="Highest utilization cards rise to the top"
        image="/ben-thinking.png"
        defaultOpen
      >
        <div className="grid gap-3">
          {prioritizedCards.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-600">
              No credit cards found yet.
            </p>
          ) : (
            prioritizedCards.map((card) => (
              <div
                key={card.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-zinc-950">{card.name}</p>
                    <p className="text-sm font-semibold text-zinc-600">
                      Balance {formatUSD(card.balance)} · Limit{" "}
                      {formatUSD(card.credit_limit || 0)}
                      {card.apr != null
                        ? ` · APR ${Number(card.apr).toFixed(2)}%`
                        : ""}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                    {pct(card.util)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="AskBen Strategy"
        subtitle="Quick actions and recovery warnings"
        image="/ben-winning.png"
      >
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Cards above 80%"
            value={String(prioritizedCards.filter((c) => c.util >= 80).length)}
            tone="rose"
          />
          <MetricCard
            label="Cards above 50%"
            value={String(prioritizedCards.filter((c) => c.util >= 50).length)}
            tone="amber"
          />
          <MetricCard
            label="Total cards"
            value={String(prioritizedCards.length)}
            tone="sky"
          />
        </section>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-xl font-black text-zinc-950">Ben says</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-zinc-700">
            Focus on the cards with the highest utilization first. That can
            reduce score pressure faster than spreading payments evenly across
            everything. Credit recovery gets real when there is a timeline.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/debt" className={moneyButtonClass}>
              Update Debt
            </a>
            <a href="/payments" className={moneyButtonClass}>
              Add Payment
            </a>
            <a href="/credit-health" className={moneyButtonClass}>
              Credit Health
            </a>
          </div>
        </div>
      </ScrollRevealCard>
    </AppShell>
  );
}
