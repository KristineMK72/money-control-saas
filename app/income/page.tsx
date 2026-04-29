"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { incomeNeedsEngine } from "@/lib/engines/incomeNeedsEngine";

/* ─────────────────────────────
   TYPES
──────────────────────────── */
type IncomeSourceRow = {
  id: string;
  name: string;
};

type IncomeEntryRow = {
  id: string;
  user_id: string;
  source_name: string;
  amount: number;
  date_iso: string;
  note: string | null;
  created_at: string;
};

/* ─────────────────────────────
   HELPERS
──────────────────────────── */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatMoneyExact(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function sourceColor(idx: number) {
  const palette = [
    "#34d399",
    "#22d3ee",
    "#a78bfa",
    "#fbbf24",
    "#f472b6",
    "#fb923c",
    "#60a5fa",
    "#4ade80",
  ];
  return palette[idx % palette.length];
}

function sourceInitial(name: string) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}

function SourceIcon({ name, idx }: { name: string; idx: number }) {
  const color = sourceColor(idx);
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
      style={{
        backgroundColor: `${color}22`,
        color: color,
        border: `1px solid ${color}55`,
      }}
    >
      {sourceInitial(name)}
    </div>
  );
}

/* ─────────────────────────────
   PAGE
──────────────────────────── */
export default function IncomePage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [sources, setSources] = useState<IncomeSourceRow[]>([]);
  const [entries, setEntries] = useState<IncomeEntryRow[]>([]);

  const [dateISO, setDateISO] = useState(todayISO());
  const [sourceName, setSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  async function loadData(uid: string) {
    const [sourcesRes, entriesRes] = await Promise.all([
      supabase
        .from("income_sources")
        .select("*")
        .eq("user_id", uid)
        .order("name", { ascending: true }),
      supabase
        .from("income_entries")
        .select("*")
        .eq("user_id", uid)
        .order("date_iso", { ascending: false }),
    ]);

    if (sourcesRes.error) setErrorMsg(sourcesRes.error.message);
    if (entriesRes.error) setErrorMsg(entriesRes.error.message);

    setSources((sourcesRes.data || []) as IncomeSourceRow[]);
    setEntries((entriesRes.data || []) as IncomeEntryRow[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      const user = data?.user;
      if (!user) {
        setErrorMsg("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadData(user.id);
      setLoading(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureSourceExists(uid: string, name: string) {
    const clean = name.trim();
    if (!clean) return;
    const exists = sources.some(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );
    if (exists) return;
    const { error } = await supabase.from("income_sources").insert({
      user_id: uid,
      name: clean,
    });
    if (error) throw new Error(error.message);
  }

  async function handleAddIncome() {
    setErrorMsg("");
    setMessage("");

    if (!userId) {
      setErrorMsg("You need to be logged in.");
      return;
    }

    const cleanSource = sourceName.trim();
    const amt = Number(amount);

    if (!cleanSource) {
      setErrorMsg("Pick or type an income source.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setErrorMsg("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      await ensureSourceExists(userId, cleanSource);

      const { error } = await supabase.from("income_entries").insert({
        user_id: userId,
        source_name: cleanSource,
        amount: amt,
        date_iso: dateISO,
        note: note.trim() || null,
      });

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }

      setSourceName("");
      setAmount("");
      setNote("");
      setDateISO(todayISO());
      setShowForm(false);
      await loadData(userId);
      setMessage("Income added.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add income.");
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this income entry?")) return;
    const { error } = await supabase
      .from("income_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  /* ───── Stats ───── */
  const totalIncome = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [entries]
  );

  const incomeThisMonth = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return entries
      .filter((e) => e.date_iso.startsWith(month))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [entries]);

  const avgIncome = useMemo(() => {
    if (entries.length === 0) return 0;
    return totalIncome / entries.length;
  }, [entries, totalIncome]);

  const needs = useMemo(() => {
    return incomeNeedsEngine({
      totalMonthlyBills: 0,
      incomeEntries: entries,
      todayISO: todayISO(),
    });
  }, [entries]);

  /* ───── Chart: 30-day trend ───── */
  const trend = useMemo(() => {
    const days: { date: string; label: string; amount: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        date: iso,
        label: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        amount: 0,
      });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    for (const e of entries) {
      const day = map.get(e.date_iso);
      if (day) day.amount += Number(e.amount || 0);
    }
    return days;
  }, [entries]);

  /* ───── Source breakdown (this month) ───── */
  const sourceBreakdown = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const m = new Map<string, number>();
    for (const e of entries) {
      if (!e.date_iso.startsWith(month)) continue;
      m.set(e.source_name, (m.get(e.source_name) || 0) + Number(e.amount || 0));
    }
    return Array.from(m.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: sourceColor(i),
      }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  /* ───── Filtered + grouped history ───── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.source_name.toLowerCase().includes(q) ||
        (e.note || "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, IncomeEntryRow[]>();
    for (const e of filtered) {
      const k = monthKey(e.date_iso);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const sourceIndex = useMemo(() => {
    const m = new Map<string, number>();
    sources.forEach((s, i) => m.set(s.name.toLowerCase(), i));
    return m;
  }, [sources]);

  function sourceIdx(name: string) {
    return sourceIndex.get((name || "").toLowerCase()) ?? 0;
  }

  /* ───── Render ───── */
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-zinc-500">Loading income…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-24">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Income
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Track every dollar coming in — Ben paces you to your monthly need.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm((s) => !s);
              setErrorMsg("");
              setMessage("");
            }}
            className="self-start md:self-auto rounded-full bg-emerald-400 text-black font-semibold px-4 py-2 text-sm hover:bg-emerald-300 transition"
          >
            {showForm ? "Cancel" : "+ Add income"}
          </button>
        </header>

        {errorMsg && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {errorMsg}
          </div>
        )}
        {message && !errorMsg && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        )}

        {/* Ben Bubble */}
        {!showForm && needs?.benMessage && (
          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">
              Ben says
            </div>
            <p className="mt-1">{needs.benMessage}</p>
          </div>
        )}

        {/* Hero stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="This month"
            value={formatMoney(incomeThisMonth)}
            tone="success"
          />
          <Stat label="All-time" value={formatMoney(totalIncome)} />
          <Stat label="Avg / entry" value={formatMoney(avgIncome)} />
          <Stat label="Entries" value={String(entries.length)} />
        </section>

        {/* Pacing needs */}
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-sm font-semibold text-white">Pacing</p>
            <p className="text-[11px] text-zinc-500">
              What Ben says you need to bring in
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Today" value={formatMoney(needs.dailyNeed)} />
            <Stat label="This week" value={formatMoney(needs.weeklyNeed)} />
            <Stat
              label="Remaining month"
              value={formatMoney(needs.remainingNeed)}
              tone={needs.remainingNeed > 0 ? "warning" : "success"}
            />
            <Stat label="Monthly need" value={formatMoney(needs.monthlyNeed)} />
          </div>
        </section>

        {/* Add Form */}
        {showForm && (
          <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/70 p-5 space-y-4">
            <p className="text-sm font-semibold text-white">New income entry</p>

            {/* Source quick chips */}
            {sources.length > 0 && (
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">
                  Pick a source
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setSourceName(s.name)}
                      className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition ${
                        sourceName.toLowerCase() === s.name.toLowerCase()
                          ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: sourceColor(i) }}
                      />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">
                Source name
                <span className="text-zinc-600 ml-1">
                  (or type a new one)
                </span>
              </label>
              <input
                list="sources"
                placeholder="Job, Tips, Side hustle…"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              />
              <datalist id="sources">
                {sources.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Date</label>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">
                Note <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., busy Friday at the salon"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <button
              onClick={handleAddIncome}
              disabled={saving || !userId}
              className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold py-2.5 text-sm transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save income"}
            </button>
          </section>
        )}

        {/* Charts */}
        {entries.length > 0 && (
          <section className="grid gap-6 lg:grid-cols-2">
            {/* 30-day trend */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="text-sm font-semibold text-white">
                Last 30 days
              </p>
              <p className="text-[11px] text-zinc-500 mb-3">
                Daily income coming in
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      stroke="#3f3f46"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      stroke="#3f3f46"
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: 8,
                        color: "#fafafa",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatMoneyExact(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="url(#incomeFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By source this month */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="text-sm font-semibold text-white">
                By source this month
              </p>
              <p className="text-[11px] text-zinc-500 mb-3">
                Where your income is coming from
              </p>
              {sourceBreakdown.length === 0 ? (
                <p className="text-xs text-zinc-500 py-12 text-center">
                  No income logged this month yet.
                </p>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceBreakdown}
                          dataKey="value"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {sourceBreakdown.map((s, i) => (
                            <Cell key={i} fill={s.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181b",
                            border: "1px solid #27272a",
                            borderRadius: 8,
                            color: "#fafafa",
                            fontSize: 12,
                          }}
                          formatter={(v: number) => formatMoneyExact(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sourceBreakdown.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-300 bg-zinc-800/60 rounded-full px-2 py-0.5"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name} · {formatMoney(s.value)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Search */}
        {entries.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search income by source or note…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
          />
        )}

        {/* Entries grouped by month */}
        <section className="space-y-6">
          {entries.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="text-5xl">💰</div>
              <p className="text-sm text-zinc-400">
                No income logged yet. Tap "Add income" to start tracking.
              </p>
            </div>
          )}

          {grouped.length === 0 && entries.length > 0 && (
            <p className="text-xs text-zinc-500 text-center py-6">
              No entries match "{search}".
            </p>
          )}

          {grouped.map(([month, items]) => {
            const total = items.reduce((s, e) => s + Number(e.amount || 0), 0);
            return (
              <div key={month} className="space-y-2">
                <div className="flex items-baseline justify-between sticky top-0 bg-zinc-950 py-1">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    {month}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {items.length} ·{" "}
                    <span className="text-emerald-400 font-semibold">
                      {formatMoney(total)}
                    </span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 hover:border-zinc-700 transition"
                    >
                      <SourceIcon
                        name={e.source_name}
                        idx={sourceIdx(e.source_name)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {e.source_name}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {new Date(e.date_iso).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {e.note ? ` · ${e.note}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-400 shrink-0">
                        +{formatMoneyExact(Number(e.amount))}
                      </p>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="opacity-60 md:opacity-0 md:group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition text-xs"
                        aria-label="Delete income"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   STAT
──────────────────────────── */
function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "text-white",
    success: "text-emerald-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`text-xl font-bold mt-1 ${colors[tone]}`}>{value}</p>
    </div>
  );
}
