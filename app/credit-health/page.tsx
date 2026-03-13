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

function utilizationTone(util: number) {
  if (util >= 75) return "text-red-600 bg-red-50";
  if (util >= 50) return "text-orange-600 bg-orange-50";
  if (util >= 30) return "text-amber-700 bg-amber-50";
  return "text-emerald-700 bg-emerald-50";
}

function utilizationLabel(util: number) {
  if (util >= 75) return "Very high";
  if (util >= 50) return "High";
  if (util >= 30) return "Watch";
  if (util > 0) return "Healthy";
  return "No usage";
}

function cardUtil(balance: number, limit: number | null) {
  if (!limit || limit <= 0) return 0;
  return (Number(balance || 0) / Number(limit)) * 100;
}

function paymentNeededForTarget(
  balance: number,
  limit: number | null,
  targetPct: number
) {
  if (!limit || limit <= 0) return 0;
  const targetBalance = limit * (targetPct / 100);
  return Math.max(0, balance - targetBalance);
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

export default function CreditHealthPage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [debts, setDebts] = useState<DebtRow[]>([]);

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
        setMessage("Please log in to view your credit health.");
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

  const loans = useMemo(
    () => debts.filter((d) => d.kind === "loan"),
    [debts]
  );

  const totals = useMemo(() => {
    const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0);
    const totalCreditDebt = creditCards.reduce(
      (sum, d) => sum + Number(d.balance || 0),
      0
    );
    const totalCreditLimit = creditCards.reduce(
      (sum, d) => sum + Number(d.credit_limit || 0),
      0
    );
    const utilization =
      totalCreditLimit > 0 ? (totalCreditDebt / totalCreditLimit) * 100 : 0;

    const totalMinimums = debts.reduce(
      (sum, d) => sum + Number(d.monthly_min_payment || d.min_payment || 0),
      0
    );

    return {
      totalDebt,
      totalCreditDebt,
      totalCreditLimit,
      utilization,
      totalMinimums,
    };
  }, [debts, creditCards]);

  const riskyCards = useMemo(() => {
    return creditCards
      .map((card) => ({
        ...card,
        utilization: cardUtil(Number(card.balance || 0), card.credit_limit),
      }))
      .filter((card) => card.credit_limit && card.credit_limit > 0)
      .sort((a, b) => b.utilization - a.utilization);
  }, [creditCards]);

  const over80Cards = useMemo(
    () => riskyCards.filter((c) => c.utilization >= 80),
    [riskyCards]
  );

  const maxedCards = useMemo(
    () => riskyCards.filter((c) => c.utilization >= 100),
    [riskyCards]
  );

  const benAdvice = useMemo(() => {
    const items: string[] = [];

    if (totals.utilization >= 75) {
      items.push(
        `${name || "Friend"}, your credit utilization is ${pct(
          totals.utilization
        )}. That is likely putting heavy pressure on your score.`
      );
    } else if (totals.utilization >= 50) {
      items.push(
        `${name || "Friend"}, your utilization is ${pct(
          totals.utilization
        )}. Getting under 30% would be a strong next move.`
      );
    } else if (totals.utilization >= 30) {
      items.push(
        `${name || "Friend"}, your utilization is ${pct(
          totals.utilization
        )}. You are in a watch zone, but not in disaster territory.`
      );
    } else if (creditCards.length > 0) {
      items.push(
        `${name || "Friend"}, your utilization is ${pct(
          totals.utilization
        )}. That is a healthier zone for score pressure.`
      );
    }

    if (maxedCards.length > 0) {
      items.push(
        `${maxedCards.length} card${maxedCards.length === 1 ? " is" : "s are"} maxed or over limit. Those are your highest-priority credit targets.`
      );
    } else if (over80Cards.length > 0) {
      items.push(
        `${over80Cards.length} card${over80Cards.length === 1 ? " is" : "s are"} above 80% utilization. Paying those down first can help the fastest.`
      );
    }

    if (totals.totalMinimums > 0) {
      items.push(
        `Your monthly debt minimums are ${formatUSD(
          totals.totalMinimums
        )}. Protect payment history first, then attack utilization.`
      );
    }

    if (creditCards.length === 0) {
      items.push(
        "No credit-card accounts found yet. Add your cards to unlock utilization coaching."
      );
    }

    return items.slice(0, 4);
  }, [totals, maxedCards, over80Cards, creditCards.length, name]);

  const targetPlan = useMemo(() => {
    return {
      to50: paymentNeededForTarget(
        totals.totalCreditDebt,
        totals.totalCreditLimit,
        50
      ),
      to30: paymentNeededForTarget(
        totals.totalCreditDebt,
        totals.totalCreditLimit,
        30
      ),
      to10: paymentNeededForTarget(
        totals.totalCreditDebt,
        totals.totalCreditLimit,
        10
      ),
    };
  }, [totals]);
    if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        Loading credit health...
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
                Credit Health
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                {name ? `${name}'s Credit Health` : "Credit Health"}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Track utilization, risk cards, score pressure, and the fastest next moves.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
  <a
    href="/dashboard"
    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
  >
    Dashboard
  </a>
  <a
    href="/debt"
    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
  >
    Credit & Loans
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
</div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          {!userId ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="font-semibold text-white">You are not logged in.</div>
              <p className="mt-2 text-sm text-zinc-300">
                Go to signup/login first, then come back here.
              </p>
              <div className="mt-4">
                <a
                  href="/signup?mode=login"
                  className="inline-flex rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Go to Signup / Login
                </a>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Credit utilization"
              value={pct(totals.utilization)}
              subtext={utilizationLabel(totals.utilization)}
            />
            <StatCard
              label="Total debt"
              value={formatUSD(totals.totalDebt)}
              subtext={`${creditCards.length} credit card${creditCards.length === 1 ? "" : "s"} · ${loans.length} loan${loans.length === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Total credit limit"
              value={formatUSD(totals.totalCreditLimit)}
            />
            <StatCard
              label="Monthly minimums"
              value={formatUSD(totals.totalMinimums)}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Accounts impacting score</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Highest utilization cards appear first.
                </p>

                <div className="mt-5 grid gap-3">
                  {riskyCards.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      No credit card accounts found yet.
                    </div>
                  ) : (
                    riskyCards.map((card) => (
                      <div key={card.id} className="rounded-2xl bg-zinc-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold">{card.name}</div>
                            <div className="mt-1 text-sm text-zinc-500">
                              Balance {formatUSD(card.balance)} · Limit{" "}
                              {formatUSD(card.credit_limit || 0)}
                              {card.apr != null
                                ? ` · APR ${Number(card.apr).toFixed(2)}%`
                                : ""}
                            </div>
                          </div>

                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${utilizationTone(
                              card.utilization
                            )}`}
                          >
                            {pct(card.utilization)} · {utilizationLabel(card.utilization)}
                          </div>
                        </div>

                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-200">
                          <div
                            className={`h-full rounded-full ${
                              card.utilization >= 75
                                ? "bg-red-500"
                                : card.utilization >= 50
                                ? "bg-orange-500"
                                : card.utilization >= 30
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, card.utilization)
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-zinc-700 md:grid-cols-3">
                          <div className="rounded-xl bg-white p-3">
                            To 50%:{" "}
                            <span className="font-semibold">
                              {formatUSD(
                                paymentNeededForTarget(
                                  card.balance,
                                  card.credit_limit,
                                  50
                                )
                              )}
                            </span>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            To 30%:{" "}
                            <span className="font-semibold">
                              {formatUSD(
                                paymentNeededForTarget(
                                  card.balance,
                                  card.credit_limit,
                                  30
                                )
                              )}
                            </span>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            To 10%:{" "}
                            <span className="font-semibold">
                              {formatUSD(
                                paymentNeededForTarget(
                                  card.balance,
                                  card.credit_limit,
                                  10
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Credit improvement plan</h2>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="font-semibold">Step 1</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Protect payment history first by covering all minimums:{" "}
                      <span className="font-bold">
                        {formatUSD(totals.totalMinimums)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="font-semibold">Step 2</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Pay <span className="font-bold">{formatUSD(targetPlan.to50)}</span>{" "}
                      to get under <span className="font-bold">50%</span> utilization.
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="font-semibold">Step 3</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Pay <span className="font-bold">{formatUSD(targetPlan.to30)}</span>{" "}
                      to get under <span className="font-bold">30%</span> utilization.
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="font-semibold">Step 4</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Long-term premium zone: pay{" "}
                      <span className="font-bold">{formatUSD(targetPlan.to10)}</span>{" "}
                      to get near <span className="font-bold">10%</span>.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Ben’s Credit Advice</h2>
                <div className="mt-4 grid gap-3">
                  {benAdvice.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Score pressure snapshot</h2>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Cards above 80%</span>
                    <span className="font-bold">{over80Cards.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Maxed cards</span>
                    <span className="font-bold">{maxedCards.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Credit accounts</span>
                    <span className="font-bold">{creditCards.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Loan accounts</span>
                    <span className="font-bold">{loans.length}</span>
                  </div>
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
                    href="/calendar"
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Open Calendar
                  </a>
                  <a
                    href="/dashboard"
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Dashboard
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">AskBen view</h2>
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                  {totals.utilization >= 75
                    ? "Your biggest score driver right now is very high utilization. Protect minimums, then attack your highest-used card first."
                    : totals.utilization >= 50
                    ? "Your score pressure is mostly utilization, not account count. Pay down your highest-used cards first."
                    : totals.utilization >= 30
                    ? "You are in a watch zone. Keep minimums current and work toward getting under 30%."
                    : "Your utilization is in a healthier zone. Stay on time and avoid unnecessary new balances."}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Credit Repair Tools</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Guided support for fixing errors, protecting payment history, and improving utilization.
                </p>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="font-semibold">Dispute incorrect information</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Track issues like wrong balances, duplicate accounts, or accounts that do not belong to you.
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="font-semibold">Goodwill / hardship letters</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Generate letters for late-payment forgiveness, hardship requests, and payment arrangement support.
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="font-semibold">Late payment protection</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Use your calendar, forecast, and minimums to catch score-damaging late-payment risk before it happens.
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                  >
                    Start dispute tool
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Generate goodwill letter
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  Ben says: Credit repair is not magic. It’s catching errors, protecting payment history, and lowering utilization on purpose.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
