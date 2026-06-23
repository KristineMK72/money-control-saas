"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { money, addMoney, clampMoney } from "@/lib/money/math";
import { todayLocalISO, currentMonthStartISO } from "@/lib/money/dates";
import { playCoins, playError } from "@/lib/sounds";

type IncomeEntry = {
  id: string;
  user_id: string;
  amount: number | string | null;
  category?: string | null;
  date_iso?: string | null;
  received_on?: string | null;
  created_at: string;
};

const CATEGORIES = [
  { value: "employment",       label: "Employment",       icon: "🏛" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "⚙️" },
  { value: "services",         label: "Services",         icon: "📋" },
  { value: "investments",      label: "Investments",      icon: "📈" },
  { value: "gifts",            label: "Gifts",            icon: "🎁" },
  { value: "other",            label: "Other",            icon: "💰" },
];

function getCategoryInfo(cat?: string | null) {
  return CATEGORIES.find(c => c.value === (cat || "").toLowerCase()) ?? { label: "Income", icon: "💰" };
}

function entryDateStr(e: IncomeEntry): string {
  return (e.date_iso || e.received_on || e.created_at || "").slice(0, 10);
}

function monthPrefix(s: string): string { return s.slice(0, 7); }

/* ── Sub-components ── */

function ColonialCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-4 ${className}`}
         style={{ background: "rgba(15,8,4,0.88)", border: "1px solid rgba(107,68,35,0.5)", backdropFilter: "blur(4px)" }}>
      {children}
    </div>
  );
}

function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-widest font-cinzel font-semibold mb-1" style={{ color: "#9a7d5a" }}>
      {children}
    </p>
  );
}

function MetricTile({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3"
         style={{ background: "rgba(107,68,35,0.15)", border: "1px solid rgba(107,68,35,0.3)" }}>
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-cinzel" style={{ color: "#9a7d5a" }}>{label}</p>
        <p className="text-base font-bold" style={{ color: "#c9a84c" }}>{value}</p>
        {sub && <p className="text-[10px]" style={{ color: "#6b4423" }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Page ── */

export default function IncomePage() {
  const [supabase]    = useState(() => createSupabaseBrowserClient());
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [entries,    setEntries]    = useState<IncomeEntry[]>([]);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState("employment");
  const [date,     setDate]     = useState(todayLocalISO());

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("income_entries").select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setEntries((data || []) as IncomeEntry[]);
    setLoading(false);
  }

  async function handleAdd() {
    setErrorMsg(""); setSuccessMsg("");
    const amt = clampMoney(amount);
    if (amt <= 0) { playError(); setErrorMsg("Enter a valid amount."); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErrorMsg("Not signed in."); setSaving(false); return; }
    const { error } = await supabase.from("income_entries").insert({
      user_id: user.id, amount: amt, category, date_iso: date,
    });
    setSaving(false);
    if (error) { playError(); setErrorMsg(error.message); return; }
    playCoins();
    setAmount("");
    setSuccessMsg("Recorded in the ledger.");
    setTimeout(() => setSuccessMsg(""), 3000);
    await loadData();
  }

  /* ── Computed — all math via lib/money/math ── */

  const thisMonthStr = monthPrefix(currentMonthStartISO());

  const lastMonthStr = useMemo(() => {
    const [y, m] = thisMonthStr.split("-").map(Number);
    const lm = m === 1 ? 12 : m - 1;
    const ly = m === 1 ? y - 1 : y;
    return `${ly}-${String(lm).padStart(2, "0")}`;
  }, [thisMonthStr]);

  const thisMonthTotal = useMemo(() =>
    addMoney(entries.filter(e => monthPrefix(entryDateStr(e)) === thisMonthStr).map(e => e.amount)),
    [entries, thisMonthStr]);

  const lastMonthTotal = useMemo(() =>
    addMoney(entries.filter(e => monthPrefix(entryDateStr(e)) === lastMonthStr).map(e => e.amount)),
    [entries, lastMonthStr]);

  const allTimeTotal = useMemo(() =>
    addMoney(entries.map(e => e.amount)), [entries]);

  const avgMonthly = useMemo(() => {
    if (!entries.length) return 0;
    const months = new Set(entries.map(e => monthPrefix(entryDateStr(e))));
    return allTimeTotal / Math.max(months.size, 1);
  }, [entries, allTimeTotal]);

  const highestMonth = useMemo(() => {
    const byMonth = new Map<string, { total: number; label: string }>();
    entries.forEach(e => {
      const key = monthPrefix(entryDateStr(e));
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const cur = byMonth.get(key) || { total: 0, label };
      byMonth.set(key, { total: addMoney([cur.total, e.amount]), label });
    });
    let best = { total: 0, label: "—" };
    byMonth.forEach(v => { if (v.total > best.total) best = v; });
    return best;
  }, [entries]);

  const sourcesCount = useMemo(() =>
    new Set(entries.map(e => e.category || "other")).size, [entries]);

  const vsLastMonth = lastMonthTotal > 0
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : null;

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const [y, m] = thisMonthStr.split("-").map(Number);
      const raw  = m - (5 - i);
      const adjM = ((raw - 1 + 12) % 12) + 1;
      const adjY = y + Math.floor((raw - 1) / 12);
      const key  = `${adjY}-${String(adjM).padStart(2, "0")}`;
      return {
        month:   new Date(adjY, adjM - 1, 1).toLocaleDateString("en-US", { month: "short" }),
        total:   addMoney(entries.filter(e => monthPrefix(entryDateStr(e)) === key).map(e => e.amount)),
        current: i === 5,
      };
    });
  }, [entries, thisMonthStr]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ben-merchant bg-cover bg-center">
        <div style={{ background: "rgba(15,8,4,0.88)", padding: "2rem 3rem", borderRadius: 12, border: "1px solid #6b4423" }}>
          <p className="font-cinzel text-lg" style={{ color: "#c9a84c" }}>Consulting the ledger&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ben-merchant bg-cover bg-center bg-fixed"
         style={{ fontFamily: "EB Garamond, serif" }}>
      <div className="min-h-screen pb-24" style={{ background: "rgba(10,5,2,0.72)" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">

          {/* Header */}
          <div className="text-center pt-4 pb-2">
            <h1 className="font-cinzel text-4xl font-bold" style={{ color: "#c9a84c" }}>
              Income Ledger
            </h1>
            <p className="mt-1 text-sm italic" style={{ color: "#9a7d5a" }}>
              Record thy earnings. Track thy prosperity. Build thy kingdom.
            </p>
          </div>

          {/* Add form */}
          <ColonialCard>
            <h2 className="font-cinzel text-xs font-semibold uppercase tracking-widest text-center mb-4"
                style={{ color: "#c9a84c" }}>Add Income</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <GoldLabel>Amount</GoldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                        style={{ color: "#2d1810" }}>$</span>
                  <input type="number" step="0.01" inputMode="decimal"
                         value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                         className="w-full rounded-md pl-7 pr-3 py-2 focus:outline-none"
                         style={{ background: "#f5e6c8", color: "#2d1810", border: "1px solid #c9a84c",
                                  fontFamily: "EB Garamond, serif", fontSize: "15px" }} />
                </div>
              </div>
              <div>
                <GoldLabel>Category</GoldLabel>
                <select value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full rounded-md px-3 py-2 focus:outline-none appearance-none cursor-pointer"
                        style={{ background: "#f5e6c8", color: "#2d1810", border: "1px solid #c9a84c",
                                 fontFamily: "EB Garamond, serif", fontSize: "15px" }}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <GoldLabel>Date</GoldLabel>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                       className="w-full rounded-md px-3 py-2 focus:outline-none"
                       style={{ background: "#f5e6c8", color: "#2d1810", border: "1px solid #c9a84c",
                                fontFamily: "EB Garamond, serif", fontSize: "15px" }} />
              </div>
            </div>

            {errorMsg && (
              <p className="mt-3 text-xs text-center px-3 py-2 rounded-lg"
                 style={{ color: "#f87171", background: "rgba(248,113,113,0.08)",
                          border: "1px solid rgba(248,113,113,0.2)" }}>
                ⚠ {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="mt-3 text-xs text-center px-3 py-2 rounded-lg font-cinzel tracking-wide"
                 style={{ color: "#c9a84c", background: "rgba(201,168,76,0.08)",
                          border: "1px solid rgba(201,168,76,0.3)" }}>
                ✦ {successMsg}
              </p>
            )}

            <button onClick={handleAdd} disabled={saving}
                    className="mt-4 w-full sm:w-auto sm:px-10 mx-auto block rounded-lg py-2.5 font-cinzel text-sm font-semibold tracking-widest uppercase transition disabled:opacity-50"
                    style={{ background: "#2d5a27", color: "#f5e6c8", border: "1px solid #4a8a42" }}>
              {saving ? "Recording\u2026" : "+ Add Income"}
            </button>
          </ColonialCard>

          {/* 3-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Recent Income */}
            <ColonialCard>
              <h3 className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-3 text-center"
                  style={{ color: "#c9a84c" }}>Recent Income</h3>
              <div className="space-y-2">
                {entries.slice(0, 5).length === 0 && (
                  <p className="text-xs text-center py-4 italic" style={{ color: "#9a7d5a" }}>No entries yet</p>
                )}
                {entries.slice(0, 5).map(e => {
                  const cat = getCategoryInfo(e.category);
                  const ds  = entryDateStr(e);
                  const [ey, em, ed] = ds.split("-").map(Number);
                  const display = Number.isFinite(ey)
                    ? new Date(ey, em - 1, ed).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : ds;
                  return (
                    <div key={e.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                           style={{ background: "rgba(107,68,35,0.3)", border: "1px solid rgba(107,68,35,0.5)" }}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#e8d5b7" }}>{cat.label}</p>
                        <p className="text-[11px]" style={{ color: "#9a7d5a" }}>{display}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0" style={{ color: "#c9a84c" }}>
                        {money(e.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
              {entries.length > 5 && (
                <p className="text-[11px] text-center mt-3 italic" style={{ color: "#9a7d5a" }}>
                  + {entries.length - 5} more entries
                </p>
              )}
            </ColonialCard>

            {/* Chart */}
            <ColonialCard>
              <h3 className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-1 text-center"
                  style={{ color: "#c9a84c" }}>Income This Month</h3>
              <p className="text-3xl font-bold text-center mb-0.5" style={{ color: "#e8d5b7" }}>
                {money(thisMonthTotal)}
              </p>
              {vsLastMonth !== null && (
                <p className="text-xs text-center mb-2"
                   style={{ color: vsLastMonth >= 0 ? "#4ade80" : "#f87171" }}>
                  vs Last Month {vsLastMonth >= 0 ? "+" : ""}{vsLastMonth}% {vsLastMonth >= 0 ? "↑" : "↓"}
                </p>
              )}
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: "#9a7d5a", fontSize: 10 }}
                           axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9a7d5a", fontSize: 10 }} axisLine={false} tickLine={false}
                           tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip
                      contentStyle={{ background: "#130c06", border: "1px solid #6b4423", borderRadius: 8,
                                      color: "#e8d5b7", fontSize: 12, fontFamily: "EB Garamond, serif" }}
                      formatter={(v: number) => [money(v), "Income"]} />
                    <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.current ? "#c9a84c" : "#4a5568"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ColonialCard>

            {/* Summary */}
            <ColonialCard>
              <h3 className="font-cinzel text-xs font-semibold uppercase tracking-widest mb-3 text-center"
                  style={{ color: "#c9a84c" }}>Income Summary</h3>
              <div className="space-y-2">
                <MetricTile icon="🏦" label="Total Income (All Time)" value={money(allTimeTotal)} />
                <MetricTile icon="🪙" label="Average Monthly"         value={money(avgMonthly)} />
                <MetricTile icon="📈" label="Highest Month"
                            value={money(highestMonth.total)} sub={highestMonth.label} />
                <MetricTile icon="👥" label="Income Sources"          value={String(sourcesCount)} />
              </div>
            </ColonialCard>

          </div>

          {/* Quote */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3"
               style={{ background: "rgba(245,230,200,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              &ldquo;Diligence is the mother of good luck.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
