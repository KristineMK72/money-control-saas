"use client";

import { useEffect, useMemo, useState } from "react";
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
  return `$${Number(n || 0).toFixed(2)}`;
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

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-5 text-zinc-950 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
      {subtext ? <div className="mt-2 text-sm text-zinc-500">{subtext}</div> : null}
    </div>
  );
}

export default function CreditRecoveryPage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
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

      setUserId(user.id);

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

    load();

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
      return "Ben says: Add your credit card limits first so I can build a real recovery plan.";
    }

    if (totalMonthlyAttack <= 0) {
      return "Ben says: Even a small extra monthly payment gives me something to work with.";
    }

    const under50 = milestones.find((m) => m.target === 50)?.months;
    const under30 = milestones.find((m) => m.target === 30)?.months;

    if (under50 === 0) {
      return `Ben says: ${name || "Friend"}, you are already under 50%. Now let’s chase 30%.`;
    }

    if (under50 != null) {
      return `Ben says: ${name || "Friend"}, if you put ${formatUSD(
        totalMonthlyAttack
      )} toward credit each month, you could get under 50% utilization in ${under50} month${under50 === 1 ? "" : "s"}.`;
    }

    if (under30 != null) {
      return `Ben says: ${name || "Friend"}, you have a path. Keep pressing and we’ll work toward 30%.`;
    }

    return "Ben says: Start with the highest-utilization card first.";
  }, [totals, totalMonthlyAttack, milestones, name]);
    if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        Loading credit recovery plan...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Credit Recovery Planner
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                {name ? `${name}'s Recovery Plan` : "Credit Recovery Plan"}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                See how fast you can lower utilization and improve credit pressure.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/credit-health"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Credit Health
              </a>
              <a
                href="/goodwill-letter"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Goodwill Letter
              </a>
              <a
                href="/dispute-letter"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Dispute Letter
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Dashboard
              </a>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total credit debt"
              value={formatUSD(totals.totalCreditDebt)}
            />
            <StatCard
              label="Total credit limit"
              value={formatUSD(totals.totalCreditLimit)}
            />
            <StatCard
              label="Current utilization"
              value={pct(totals.utilization)}
            />
            <StatCard
              label="Monthly minimums"
              value={formatUSD(totals.totalMinimums)}
              subtext="Base payment already required"
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Set your extra monthly payment</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Add the extra amount you think you can put toward credit each month.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-600">
                      Extra monthly payment
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={extraPayment}
                      onChange={(e) => setExtraPayment(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-3"
                    />
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="text-sm text-zinc-500">Total monthly attack</div>
                    <div className="mt-2 text-3xl font-black text-zinc-950">
                      {formatUSD(totalMonthlyAttack)}
                    </div>
                    <div className="mt-2 text-sm text-zinc-500">
                      Minimums + extra payment
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  {benMessage}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Recovery milestones</h2>
                <div className="mt-5 grid gap-3">
                  {milestones.map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                    >
                      <div>
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-sm text-zinc-500">
                          Target utilization: {m.target}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {m.months == null
                            ? "—"
                            : m.months === 0
                            ? "Already there"
                            : `${m.months} mo`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Best cards to focus on first</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Highest utilization cards rise to the top.
                </p>

                <div className="mt-5 grid gap-3">
                  {prioritizedCards.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      No credit cards found yet.
                    </div>
                  ) : (
                    prioritizedCards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-2xl bg-zinc-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-semibold">{card.name}</div>
                            <div className="text-sm text-zinc-500">
                              Balance {formatUSD(card.balance)} · Limit {formatUSD(card.credit_limit || 0)}
                              {card.apr != null ? ` · APR ${Number(card.apr).toFixed(2)}%` : ""}
                            </div>
                          </div>

                          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-800">
                            {pct(card.util)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">AskBen strategy</h2>
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                  Focus on the cards with the highest utilization first. That can reduce score pressure faster than spreading payments evenly across everything.
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Quick actions</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="/debt"
                    className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                  >
                    Update Debt
                  </a>
                  <a
                    href="/payments"
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Add Payment
                  </a>
                  <a
                    href="/credit-health"
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Credit Health
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Recovery view</h2>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Cards above 80%</span>
                    <span className="font-bold">
                      {prioritizedCards.filter((c) => c.util >= 80).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Cards above 50%</span>
                    <span className="font-bold">
                      {prioritizedCards.filter((c) => c.util >= 50).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Total cards</span>
                    <span className="font-bold">{prioritizedCards.length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Ben says</h2>
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  Credit recovery gets real when there is a timeline. A plan beats vague stress every time.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
