"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/lib/supabase/provider";

type Debt = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan" | string;
  balance: string;
  min_payment: string;
  monthly_min_payment: string | null;
  due_day: number | null;
  apr: number | null;
  credit_limit: string | null;
  note: string | null;
  is_monthly: boolean | null;
  created_at: string;
};

type SmartDebt = Debt & {
  balanceNum: number;
  minPaymentNum: number;
  aprNum: number | null;
  snowballRank: number;
  avalancheRank: number;
};

function formatCurrency(value: number) {
  if (isNaN(value)) return "$0";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number | null) {
  if (value == null || isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function getEstimatedApr(kind: string): number {
  // Simple heuristic for missing APRs
  if (kind === "loan") return 12;
  return 29.99;
}

function getDebtPressureScore(totalDebt: number, totalMin: number): number {
  if (totalDebt <= 0 || totalMin <= 0) return 0;
  const ratio = totalMin / Math.max(totalDebt, 1);
  // Higher ratio = more pressure
  return Math.min(100, Math.round(ratio * 4000));
}

function getMomentumScore(totalMin: number, accountCount: number): number {
  if (accountCount === 0) return 0;
  const avgMin = totalMin / accountCount;
  return Math.max(0, Math.min(100, Math.round((avgMin / 150) * 100)));
}

export default function DebtPage() {
  const { supabase, session } = useSupabase();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newDebt, setNewDebt] = useState({
    name: "",
    kind: "credit" as "credit" | "loan",
    balance: "",
    min_payment: "",
    apr: "",
    due_day: "",
    credit_limit: "",
    note: "",
  });

  useEffect(() => {
    if (!supabase || !session?.user) return;

    const loadDebts = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("due_day", { ascending: true });

      if (error) {
        console.error(error);
        setError("Trouble loading your debts. Try again in a moment.");
      } else {
        setDebts((data || []) as Debt[]);
      }
      setLoading(false);
    };

    loadDebts();
  }, [supabase, session?.user]);

  const smartDebts: SmartDebt[] = useMemo(() => {
    const withNumbers = debts.map((d) => {
      const balanceNum = parseFloat(d.balance || "0") || 0;
      const minPaymentNum =
        parseFloat(d.monthly_min_payment || d.min_payment || "0") || 0;
      const aprNum =
        d.apr != null
          ? Number(d.apr)
          : getEstimatedApr(d.kind || "credit");

      return {
        ...d,
        balanceNum,
        minPaymentNum,
        aprNum: isNaN(aprNum) ? null : aprNum,
        snowballRank: 0,
        avalancheRank: 0,
      };
    });

    const snowballSorted = [...withNumbers].sort(
      (a, b) => a.balanceNum - b.balanceNum
    );
    const avalancheSorted = [...withNumbers].sort((a, b) => {
      const aApr = a.aprNum ?? getEstimatedApr(a.kind);
      const bApr = b.aprNum ?? getEstimatedApr(b.kind);
      return bApr - aApr;
    });

    const snowballRanks = new Map<string, number>();
    const avalancheRanks = new Map<string, number>();

    snowballSorted.forEach((d, idx) => snowballRanks.set(d.id, idx + 1));
    avalancheSorted.forEach((d, idx) => avalancheRanks.set(d.id, idx + 1));

    return withNumbers.map((d) => ({
      ...d,
      snowballRank: snowballRanks.get(d.id) || 0,
      avalancheRank: avalancheRanks.get(d.id) || 0,
    }));
  }, [debts]);

  const stats = useMemo(() => {
    if (smartDebts.length === 0) {
      return {
        totalDebt: 0,
        totalMin: 0,
        avgApr: null as number | null,
        accountCount: 0,
        highestApr: null as number | null,
        pressureScore: 0,
        momentumScore: 0,
      };
    }

    const totalDebt = smartDebts.reduce(
      (sum, d) => sum + d.balanceNum,
      0
    );
    const totalMin = smartDebts.reduce(
      (sum, d) => sum + d.minPaymentNum,
      0
    );

    const aprValues = smartDebts
      .map((d) => d.aprNum)
      .filter((v): v is number => v != null && !isNaN(v));

    const avgApr =
      aprValues.length > 0
        ? aprValues.reduce((s, v) => s + v, 0) / aprValues.length
        : null;

    const highestApr =
      aprValues.length > 0 ? Math.max(...aprValues) : null;

    const pressureScore = getDebtPressureScore(totalDebt, totalMin);
    const momentumScore = getMomentumScore(totalMin, smartDebts.length);

    return {
      totalDebt,
      totalMin,
      avgApr,
      accountCount: smartDebts.length,
      highestApr,
      pressureScore,
      momentumScore,
    };
  }, [smartDebts]);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !session?.user) return;

    setAdding(true);
    setError(null);

    const balanceNum = parseFloat(newDebt.balance || "0") || 0;
    const minPaymentNum = parseFloat(newDebt.min_payment || "0") || 0;
    const aprNum =
      newDebt.apr.trim() === "" ? null : parseFloat(newDebt.apr);

    const dueDayNum =
      newDebt.due_day.trim() === ""
        ? null
        : Math.min(31, Math.max(1, parseInt(newDebt.due_day, 10)));

    const { data, error } = await supabase
      .from("debts")
      .insert({
        user_id: session.user.id,
        name: newDebt.name.trim() || "New debt",
        kind: newDebt.kind,
        balance: balanceNum.toFixed(2),
        min_payment: minPaymentNum.toFixed(2),
        monthly_min_payment: minPaymentNum.toFixed(2),
        apr: aprNum,
        credit_limit:
          newDebt.credit_limit.trim() === ""
            ? null
            : parseFloat(newDebt.credit_limit),
        note: newDebt.note.trim() || null,
        is_monthly: true,
        due_day: dueDayNum,
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setError("Could not add this debt. Try again.");
    } else if (data) {
      setDebts((prev) => [...prev, data as Debt]);
      setNewDebt({
        name: "",
        kind: "credit",
        balance: "",
        min_payment: "",
        apr: "",
        due_day: "",
        credit_limit: "",
        note: "",
      });
    }

    setAdding(false);
  };

  const handleDeleteDebt = async (id: string) => {
    if (!supabase || !session?.user) return;
    const confirmed = window.confirm(
      "Remove this debt from your list? This does not affect your real account."
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error(error);
      setError("Could not delete this debt. Try again.");
    } else {
      setDebts((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const benMessage = useMemo(() => {
    if (smartDebts.length === 0) {
      return {
        title: "Let’s map your debt landscape.",
        body: "Add your first debt — even if it’s just one card. Once I see the full picture, I can tell you exactly where a small extra payment will hit the hardest.",
        tone: "neutral" as "neutral" | "encouraging" | "urgent",
      };
    }

    if (stats.pressureScore >= 75) {
      return {
        title: "Your debt is loud — but so is your leverage.",
        body: "Your minimums are eating a big chunk of your cash flow. That’s stressful — and real. But it also means every extra $20 you throw at the highest‑interest debt is doing serious damage to future interest.",
        tone: "urgent" as const,
      };
    }

    if (stats.momentumScore >= 60) {
      return {
        title: "You’ve already built momentum.",
        body: "Your average minimum payment is meaningful. That means you’re already pushing the snowball. A tiny bit of extra focus — one target debt at a time — will move your payoff date closer than you think.",
        tone: "encouraging" as const,
      };
    }

    return {
      title: "We can turn this into a plan, not a panic.",
      body: "You don’t have to fix everything at once. We’ll pick one debt to attack — either the smallest balance for a quick win, or the highest APR for maximum interest savings — and build from there.",
      tone: "neutral" as const,
    };
  }, [smartDebts, stats.pressureScore, stats.momentumScore]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Debt game plan
          </h1>
          <p className="text-zinc-400 text-sm">
            See every balance, every minimum, and exactly where an extra
            payment hits the hardest.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* Stats row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Total debt
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {formatCurrency(stats.totalDebt)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Across {stats.accountCount} accounts
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Monthly minimums
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {formatCurrency(stats.totalMin)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Required just to stand still
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Average APR
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {formatPercent(stats.avgApr)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Higher APR = higher interest pressure
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Debt pressure
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">
                {stats.pressureScore}
              </span>
              <span className="text-xs text-zinc-500">/ 100</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              How heavy your minimums feel on your cash flow
            </div>
          </div>
        </section>

        {/* Ben coaching */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-6 items-start">
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-lg">
                  💬
                </div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Ben’s read on your debt
                </div>
              </div>
              <h2 className="text-lg font-semibold mb-1">
                {benMessage.title}
              </h2>
              <p className="text-sm text-zinc-300">{benMessage.body}</p>
            </div>

            {/* Add debt form */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Add a debt
                  </div>
                  <p className="text-xs text-zinc-400">
                    Even rough numbers are fine — you can refine APRs later.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAddDebt}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
              >
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">
                    Name
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Card or loan name"
                    value={newDebt.name}
                    onChange={(e) =>
                      setNewDebt((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">
                    Balance
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="e.g. 1200"
                    inputMode="decimal"
                    value={newDebt.balance}
                    onChange={(e) =>
                      setNewDebt((p) => ({
                        ...p,
                        balance: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">
                    Minimum payment
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="e.g. 45"
                    inputMode="decimal"
                    value={newDebt.min_payment}
                    onChange={(e) =>
                      setNewDebt((p) => ({
                        ...p,
                        min_payment: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">
                    APR (optional)
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="e.g. 29.99"
                    inputMode="decimal"
                    value={newDebt.apr}
                    onChange={(e) =>
                      setNewDebt((p) => ({
                        ...p,
                        apr: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">
                    Due day (1–31)
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="e.g. 15"
                    inputMode="numeric"
                    value={newDebt.due_day}
                    onChange={(e) =>
                      setNewDebt((p) => ({
                        ...p,
                        due_day: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">
                    Type
                  </label>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    value={newDebt.kind}
                    onChange={(e) =>
                      setNewDebt((p) => ({
                        ...p,
                        kind: e.target.value as "credit" | "loan",
                      }))
                    }
                  >
                    <option value="credit">Credit</option>
                    <option value="loan">Loan</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs text-zinc-400">
                    Notes (optional)
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    placeholder='e.g. "Behind", "0% promo until October"'
                    value={newDebt.note}
                    onChange={(e) =>
                      setNewDebt((p) => ({
                        ...p,
                        note: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={adding}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {adding ? "Adding…" : "Add debt"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Smart ordering panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
                Smart payoff order
              </div>
              {smartDebts.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Once you add a few debts, I’ll show you two payoff
                  paths: snowball (smallest balance first) and avalanche
                  (highest APR first). You can choose the one that fits
                  your brain and your bandwidth.
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-1">
                      Snowball (quick wins)
                    </div>
                    <ol className="space-y-1 text-zinc-200">
                      {smartDebts
                        .slice()
                        .sort((a, b) => a.snowballRank - b.snowballRank)
                        .map((d) => (
                          <li key={d.id} className="flex justify-between">
                            <span>
                              {d.snowballRank}. {d.name}
                            </span>
                            <span className="text-zinc-500">
                              {formatCurrency(d.balanceNum)}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </div>

                  <div className="h-px bg-zinc-800" />

                  <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-1">
                      Avalanche (interest savings)
                    </div>
                    <ol className="space-y-1 text-zinc-200">
                      {smartDebts
                        .slice()
                        .sort(
                          (a, b) => a.avalancheRank - b.avalancheRank
                        )
                        .map((d) => (
                          <li key={d.id} className="flex justify-between">
                            <span>
                              {d.avalancheRank}. {d.name}
                            </span>
                            <span className="text-zinc-500">
                              {formatPercent(d.aprNum)}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-xs text-zinc-400 space-y-2">
              <div className="font-semibold text-zinc-300">
                How to use this page
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Make sure every active card or loan is listed — even if
                  the numbers are rough.
                </li>
                <li>
                  Add APRs when you can. That unlocks more accurate
                  avalanche and payoff estimates.
                </li>
                <li>
                  Pick either snowball (motivation) or avalanche (math)
                  and commit to one target at a time.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Debt list */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">
              All debts
            </h2>
            {loading && (
              <span className="text-xs text-zinc-500">
                Loading your debts…
              </span>
            )}
          </div>

          {smartDebts.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-6 text-sm text-zinc-400">
              No debts added yet. Start with one card or loan — you can
              always refine the details later.
            </div>
          ) : (
            <div className="space-y-2">
              {smartDebts
                .slice()
                .sort((a, b) => {
                  const aDay = a.due_day ?? 99;
                  const bDay = b.due_day ?? 99;
                  return aDay - bDay;
                })
                .map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {d.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">
                          {d.kind === "loan" ? "Loan" : "Credit"}
                        </span>
                        {d.note && (
                          <span className="text-[10px] rounded-full bg-amber-500/10 text-amber-300 px-2 py-0.5 border border-amber-500/40">
                            {d.note}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                        <span>
                          Balance:{" "}
                          <span className="text-zinc-100">
                            {formatCurrency(d.balanceNum)}
                          </span>
                        </span>
                        <span>
                          Minimum:{" "}
                          <span className="text-zinc-100">
                            {formatCurrency(d.minPaymentNum)}
                          </span>
                        </span>
                        <span>
                          APR:{" "}
                          <span className="text-zinc-100">
                            {formatPercent(d.aprNum)}
                          </span>
                        </span>
                        {d.due_day && (
                          <span>
                            Due day:{" "}
                            <span className="text-zinc-100">
                              {d.due_day}
                            </span>
                          </span>
                        )}
                        {d.credit_limit && (
                          <span>
                            Limit:{" "}
                            <span className="text-zinc-100">
                              {formatCurrency(
                                parseFloat(d.credit_limit || "0") || 0
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
                        <span>
                          Snowball rank:{" "}
                          <span className="text-zinc-200">
                            {d.snowballRank}
                          </span>
                        </span>
                        <span>
                          Avalanche rank:{" "}
                          <span className="text-zinc-200">
                            {d.avalancheRank}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <button
                        onClick={() => handleDeleteDebt(d.id)}
                        className="text-xs rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
