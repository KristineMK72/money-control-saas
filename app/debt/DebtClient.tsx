"use client";

import React, { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  if (kind === "loan") return 12;
  return 29.99;
}

function getDebtPressureScore(totalDebt: number, totalMin: number): number {
  if (totalDebt <= 0 || totalMin <= 0) return 0;
  const ratio = totalMin / Math.max(totalDebt, 1);
  return Math.min(100, Math.round(ratio * 4000));
}

function getMomentumScore(totalMin: number, accountCount: number): number {
  if (accountCount === 0) return 0;
  const avgMin = totalMin / accountCount;
  return Math.max(0, Math.min(100, Math.round((avgMin / 150) * 100)));
}

type Props = {
  initialDebts: Debt[];
  initialError: string | null;
};

export default function DebtClient({ initialDebts, initialError }: Props) {
  const supabase = createSupabaseBrowserClient();

  const [debts, setDebts] = useState(initialDebts || []);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(initialError);
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

  const smartDebts: SmartDebt[] = useMemo(() => {
    const withNumbers = debts.map((d) => {
      const balanceNum = parseFloat(d.balance || "0") || 0;
      const minPaymentNum =
        parseFloat(d.monthly_min_payment || d.min_payment || "0") || 0;
      const aprNum =
        d.apr != null ? Number(d.apr) : getEstimatedApr(d.kind || "credit");

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

    const snowballRanks = new Map();
    const avalancheRanks = new Map();

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

    const totalDebt = smartDebts.reduce((sum, d) => sum + d.balanceNum, 0);
    const totalMin = smartDebts.reduce((sum, d) => sum + d.minPaymentNum, 0);

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
    const confirmed = window.confirm(
      "Remove this debt from your list? This does not affect your real account."
    );
    if (!confirmed) return;

    const { error } = await supabase.from("debts").delete().eq("id", id);

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
      };
    }

    if (stats.pressureScore >= 75) {
      return {
        title: "Your debt is loud — but so is your leverage.",
        body: "Your minimums are eating a big chunk of your cash flow. That’s stressful — and real. But it also means every extra $20 you throw at the highest‑interest debt is doing serious damage to future interest.",
      };
    }

    if (stats.momentumScore >= 60) {
      return {
        title: "You’ve already built momentum.",
        body: "Your average minimum payment is meaningful. That means you’re already pushing the snowball. A tiny bit of extra focus — one target debt at a time — will move your payoff date closer than you think.",
      };
    }

    return {
      title: "We can turn this into a plan, not a panic.",
      body: "You don’t have to fix everything at once. We’ll pick one debt to attack — either the smallest balance for a quick win, or the highest APR for maximum interest savings — and build from there.",
    };
  }, [smartDebts, stats.pressureScore, stats.momentumScore]);

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">Debt game plan</h1>
      <p className="text-neutral-400">
        See every balance, every minimum, and exactly where an extra payment hits the hardest.
      </p>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-neutral-400">Total debt</div>
          <div className="text-xl font-semibold">
            {formatCurrency(stats.totalDebt)}
          </div>
          <div className="text-xs text-neutral-500">
            Across {stats.accountCount} accounts
          </div>
        </div>

        <div>
          <div className="text-sm text-neutral-400">Monthly minimums</div>
          <div className="text-xl font-semibold">
            {formatCurrency(stats.totalMin)}
          </div>
          <div className="text-xs text-neutral-500">
            Required just to stand still
          </div>
        </div>

        <div>
          <div className="text-sm text-neutral-400">Average APR</div>
          <div className="text-xl font-semibold">
            {formatPercent(stats.avgApr)}
          </div>
        </div>

        <div>
          <div className="text-sm text-neutral-400">Debt pressure</div>
          <div className="text-xl font-semibold">
            {stats.pressureScore} / 100
          </div>
        </div>
      </div>

      {/* Ben coaching */}
      <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
        <div className="text-lg font-semibold mb-2">💬 Ben’s read on your debt</div>
        <h2 className="text-xl font-bold mb-1">{benMessage.title}</h2>
        <p className="text-neutral-300">{benMessage.body}</p>
      </div>

      {/* Add debt form */}
      <form onSubmit={handleAddDebt} className="space-y-4">
        <h2 className="text-xl font-bold">Add a debt</h2>
        <p className="text-neutral-400">
          Even rough numbers are fine — you can refine APRs later.
        </p>

        <input
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
          placeholder="Name"
          value={newDebt.name}
          onChange={(e) =>
            setNewDebt((p) => ({ ...p, name: e.target.value }))
          }
        />

        <input
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
          placeholder="Balance"
          value={newDebt.balance}
          onChange={(e) =>
            setNewDebt((p) => ({ ...p, balance: e.target.value }))
          }
        />

        <input
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
          placeholder="Minimum payment"
          value={newDebt.min_payment}
          onChange={(e) =>
            setNewDebt((p) => ({ ...p, min_payment: e.target.value }))
          }
        />

        <input
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
          placeholder="APR (optional)"
          value={newDebt.apr}
          onChange={(e) =>
            setNewDebt((p) => ({ ...p, apr: e.target.value }))
          }
        />

        <input
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
          placeholder="Due day (1–31)"
          value={newDebt.due_day}
          onChange={(e) =>
            setNewDebt((p) => ({ ...p, due_day: e.target.value }))
          }
        />

        <select
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
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

        <textarea
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
          placeholder="Notes (optional)"
          value={newDebt.note}
          onChange={(e) =>
            setNewDebt((p) => ({ ...p, note: e.target.value }))
          }
        />

        <button
          type="submit"
          disabled={adding}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
        >
          {adding ? "Adding…" : "Add debt"}
        </button>
      </form>

      {/* Smart payoff order */}
      <div>
        <h2 className="text-xl font-bold mb-2">Smart payoff order</h2>

        {smartDebts.length === 0 ? (
          <p className="text-neutral-400">
            Once you add a few debts, I’ll show you two payoff paths: snowball
            (smallest balance first) and avalanche (highest APR first).
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Snowball (quick wins)</h3>
              {smartDebts
                .slice()
                .sort((a, b) => a.snowballRank - b.snowballRank)
                .map((d) => (
                  <div key={d.id} className="text-neutral-300">
                    {d.snowballRank}. {d.name} —{" "}
                    {formatCurrency(d.balanceNum)}
                  </div>
                ))}
            </div>

            <div>
              <h3 className="font-semibold">Avalanche (interest savings)</h3>
              {smartDebts
                .slice()
                .sort((a, b) => a.avalancheRank - b.avalancheRank)
                .map((d) => (
                  <div key={d.id} className="text-neutral-300">
                    {d.avalancheRank}. {d.name} —{" "}
                    {formatPercent(d.aprNum)}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Debt list */}
      <div>
        <h2 className="text-xl font-bold mb-2">All debts</h2>

        {smartDebts.length === 0 ? (
          <p className="text-neutral-400">
            No debts added yet. Start with one card or loan — you can always
            refine the details later.
          </p>
        ) : (
          smartDebts
            .slice()
            .sort((a, b) => {
              const aDay = a.due_day ?? 99;
              const bDay = b.due_day ?? 99;
              return aDay - bDay;
            })
            .map((d) => (
              <div
                key={d.id}
                className="p-
