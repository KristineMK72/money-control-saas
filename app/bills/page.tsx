"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ─────────────────────────────
   TYPES
──────────────────────────── */
type BillRow = {
  id: string;
  user_id: string;
  name: string;
  kind: string | null;
  category: string | null;
  target: number | null;
  saved: number | null;
  due_date: string | null;
  due: string | null;
  priority: number | null;
  focus: boolean | null;
  balance: number | null;
  apr: number | null;
  min_payment: number | null;
  credit_limit: number | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  bill_id: string | null;
  debt_id: string | null;
  amount: number;
  date_iso: string;
  merchant: string | null;
  note: string | null;
  created_at: string;
};

type IncomeRow = {
  id: string;
  user_id: string;
  amount: number;
  date_iso: string | null;
  received_on: string | null;
  created_at: string;
};

type BillKind =
  | "credit"
  | "subscription"
  | "sinking"
  | "goal"
  | "fixed"
  | "unknown";

type FilterKey = "all" | BillKind;

/* ─────────────────────────────
   HELPERS
──────────────────────────── */
function getBillMonthlyAmount(bill: BillRow): number {
  if (bill.target != null && bill.target > 0) return Number(bill.target);
  if (bill.monthly_target != null && bill.monthly_target > 0)
    return Number(bill.monthly_target);
  if (bill.min_payment != null && bill.min_payment > 0)
    return Number(bill.min_payment);
  return 0;
}

function classifyBill(bill: BillRow): BillKind {
  const hasCredit =
    bill.balance != null ||
    bill.min_payment != null ||
    bill.credit_limit != null;
  const hasSinking = bill.saved != null && bill.target != null;
  const hasGoal =
    bill.target != null && (bill.priority != null || bill.focus === true);

  if (hasCredit) return "credit";
  if (hasSinking) return "sinking";
  if (hasGoal) return "goal";
  if (bill.target != null || bill.monthly_target != null) return "subscription";
  if (bill.due_day != null || bill.due_date != null) return "fixed";
  return "unknown";
}

function kindLabel(k: BillKind) {
  return {
    credit: "Credit",
    subscription: "Subscription",
    sinking: "Sinking Fund",
    goal: "Goal",
    fixed: "Fixed Bill",
    unknown: "Other",
  }[k];
}

function kindColor(k: BillKind) {
  return {
    credit: "#f87171",
    subscription: "#22d3ee",
    sinking: "#a78bfa",
    goal: "#34d399",
    fixed: "#fbbf24",
    unknown: "#71717a",
  }[k];
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function isSameMonth(d: Date, ref: Date) {
  return (
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  );
}

/** Cheap auto-logo: try Clearbit with a guessed domain. Falls back to initials. */
function guessDomain(name: string): string {
  const n = name.toLowerCase().trim();
  // Common known mappings
  const map: Record<string, string> = {
    netflix: "netflix.com",
    spotify: "spotify.com",
    hulu: "hulu.com",
    disney: "disneyplus.com",
    "disney+": "disneyplus.com",
    amazon: "amazon.com",
    apple: "apple.com",
    google: "google.com",
    youtube: "youtube.com",
    cosmoprof: "cosmoprof.com",
    progressive: "progressive.com",
    geico: "geico.com",
    statefarm: "statefarm.com",
    verizon: "verizon.com",
    "t-mobile": "t-mobile.com",
    att: "att.com",
    comcast: "xfinity.com",
    xfinity: "xfinity.com",
    rent: "",
    aspire: "aspirecard.com",
    aspire1: "aspirecard.com",
    "home choice": "homechoice.com",
    homechoice: "homechoice.com",
  };
  if (map[n] != null) return map[n];
  // strip non-letters, append .com
  const slug = n.replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : "";
}

function BillLogo({ name }: { name: string }) {
  const domain = guessDomain(name);
  const [failed, setFailed] = useState(!domain);

  if (failed || !domain) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-200 shrink-0">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt=""
      className="w-10 h-10 rounded-lg object-contain bg-white p-1 shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

function pressureLabel(p: number) {
  if (!isFinite(p) || p <= 0) return "Add bills and income for a real read.";
  if (p < 0.3) return "Low pressure — you've got room to breathe.";
  if (p < 0.6) return "Manageable — stay mindful, you're okay.";
  if (p < 1) return "High pressure — bills eat most of your income.";
  return "Critical — bills exceed income this month. Let's triage.";
}

function pressureColor(p: number) {
  if (!isFinite(p) || p <= 0) return "#71717a";
  if (p < 0.3) return "#34d399";
  if (p < 0.6) return "#fbbf24";
  if (p < 1) return "#fb923c";
  return "#f87171";
}

/* ─────────────────────────────
   PRESSURE RING
──────────────────────────── */
function PressureRing({ pressure }: { pressure: number }) {
  const pct = Math.min(1, Math.max(0, pressure));
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - pct * circumference;
  const color = pressureColor(pressure);
  const display = isFinite(pressure) ? Math.round(pressure * 100) : 0;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#27272a"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{display}%</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          Pressure
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   PAGE
──────────────────────────── */
export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    async function init() {
      setLoading(true);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        setMessage(userError.message);
        setLoading(false);
        return;
      }

      const user = userData?.user;
      if (!user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      const uid = user.id;
      const [billsRes, paymentsRes, incomeRes] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", uid),
        supabase.from("payments").select("*").eq("user_id", uid),
        supabase.from("income_entries").select("*").eq("user_id", uid),
      ]);

      if (billsRes.error) setMessage(billsRes.error.message);
      if (paymentsRes.error) setMessage(paymentsRes.error.message);

      setBills((billsRes.data || []) as BillRow[]);
      setPayments((paymentsRes.data || []) as PaymentRow[]);
      setIncomeEntries((incomeRes.data || []) as IncomeRow[]);
      setLoading(false);
    }

    init();
  }, [supabase]);

  /* ───── Derivations ───── */
  const today = new Date();

  const monthlyIncome = useMemo(() => {
    return incomeEntries.reduce((sum, i) => {
      const date =
        (i.date_iso && new Date(i.date_iso)) ||
        (i.received_on && new Date(i.received_on)) ||
        new Date(i.created_at);
      if (!isNaN(date.getTime()) && isSameMonth(date, today)) {
        return sum + (i.amount || 0);
      }
      return sum;
    }, 0);
  }, [incomeEntries]);

  const totalMonthlyBills = useMemo(
    () => bills.reduce((s, b) => s + getBillMonthlyAmount(b), 0),
    [bills]
  );

  const billPressure =
    monthlyIncome > 0 ? totalMonthlyBills / monthlyIncome : 0;

  const billsWithPayments = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      if (p.bill_id) {
        m.set(p.bill_id, (m.get(p.bill_id) || 0) + Number(p.amount));
      }
    }
    return m;
  }, [payments]);

  const byKind = useMemo(() => {
    const m = new Map<BillKind, number>();
    for (const b of bills) {
      const k = classifyBill(b);
      m.set(k, (m.get(k) || 0) + getBillMonthlyAmount(b));
    }
    return Array.from(m.entries());
  }, [bills]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bills) {
      const cat = b.category || "Uncategorized";
      m.set(cat, (m.get(cat) || 0) + getBillMonthlyAmount(b));
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [bills]);

  const paymentsTrend = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      if (!p.date_iso) continue;
      m.set(p.date_iso, (m.get(p.date_iso) || 0) + Number(p.amount));
    }
    return Array.from(m.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-30)
      .map(([date, amt]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        amount: amt,
      }));
  }, [payments]);

  const upcoming = useMemo(() => {
    const todayDay = today.getDate();
    return bills
      .map((b) => {
        const kind = classifyBill(b);
        const amount = getBillMonthlyAmount(b);
        let daysUntil: number | null = null;
        if (b.due_day != null) {
          const diff = b.due_day - todayDay;
          daysUntil = diff >= 0 ? diff : diff + 30;
        }
        return { bill: b, kind, amount, daysUntil };
      })
      .filter((x) => x.daysUntil != null)
      .sort((a, b) => (a.daysUntil! - b.daysUntil!))
      .slice(0, 8);
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (filter === "all") return bills;
    return bills.filter((b) => classifyBill(b) === filter);
  }, [bills, filter]);

  const kindCounts = useMemo(() => {
    const m = new Map<BillKind, number>();
    for (const b of bills) {
      const k = classifyBill(b);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [bills]);

  const filterChips: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: bills.length },
    {
      key: "credit",
      label: "Credit",
      count: kindCounts.get("credit") || 0,
    },
    {
      key: "subscription",
      label: "Subscriptions",
      count: kindCounts.get("subscription") || 0,
    },
    {
      key: "fixed",
      label: "Fixed",
      count: kindCounts.get("fixed") || 0,
    },
    {
      key: "sinking",
      label: "Sinking",
      count: kindCounts.get("sinking") || 0,
    },
    { key: "goal", label: "Goals", count: kindCounts.get("goal") || 0 },
  ];

  /* ───── Loading ───── */
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-white/60">Loading bills…</p>
        </div>
      </main>
    );
  }

  /* ───── Empty ───── */
  if (!bills.length) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-12">
        <div className="mx-auto max-w-2xl text-center space-y-4">
          <div className="text-6xl">📋</div>
          <h1 className="text-2xl font-bold">No bills yet</h1>
          <p className="text-zinc-400">
            Add your first bill and Ben will start tracking pressure, due dates,
            and pay-down progress.
          </p>
          <a
            href="/bills/new"
            className="inline-block rounded-full bg-emerald-400 text-black font-semibold px-6 py-2 hover:bg-emerald-300 transition"
          >
            Add a bill
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-8 pb-24">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              Bills
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Smart view of your monthly obligations, pressure, and payments.
            </p>
          </div>

          <a
            href="/bills/new"
            className="rounded-full bg-emerald-400 text-black font-semibold px-4 py-2 text-sm hover:bg-emerald-300 transition self-start md:self-auto"
          >
            + Add bill
          </a>
        </header>

        {message && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {message}
          </div>
        )}

        {/* Hero: Pressure Ring + Mix */}
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <PressureRing pressure={billPressure} />

            <div className="flex-1 w-full space-y-4">
              <div>
                <p className="text-sm text-white">
                  {pressureLabel(billPressure)}
                </p>
                <div className="mt-3 h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, billPressure * 100)}%`,
                      backgroundColor: pressureColor(billPressure),
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[11px] text-zinc-500">
                  <span>{formatMoney(totalMonthlyBills)} in bills</span>
                  <span>{formatMoney(monthlyIncome)} income this month</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Stat
                  label="Bills"
                  value={String(bills.length)}
                  tone="default"
                />
                <Stat
                  label="Paid this month"
                  value={String(
                    bills.filter((b) => billsWithPayments.has(b.id)).length
                  )}
                  tone="success"
                />
                <Stat
                  label="Monthly total"
                  value={formatMoney(totalMonthlyBills)}
                  tone="default"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Mix donut */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm font-semibold text-white">Bill mix</p>
            <p className="text-[11px] text-zinc-500 mb-3">
              Where your monthly money is going
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byKind.map(([k, v]) => ({
                      name: kindLabel(k),
                      value: v,
                      color: kindColor(k),
                    }))}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {byKind.map(([k]) => (
                      <Cell key={k} fill={kindColor(k)} />
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
                    formatter={(v: number) => formatMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {byKind.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center gap-1.5 text-[11px] text-zinc-300 bg-zinc-800/60 rounded-full px-2 py-0.5"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: kindColor(k) }}
                  />
                  {kindLabel(k)} · {formatMoney(v)}
                </div>
              ))}
            </div>
          </div>

          {/* Category bars */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm font-semibold text-white">By category</p>
            <p className="text-[11px] text-zinc-500 mb-3">
              Top spending categories
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byCategory.slice(0, 8).map(([cat, v]) => ({
                    cat,
                    v,
                  }))}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    stroke="#3f3f46"
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="cat"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    stroke="#3f3f46"
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                      color: "#fafafa",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                  <Bar dataKey="v" fill="#22d3ee" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Payments trend */}
        {paymentsTrend.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm font-semibold text-white">Recent payments</p>
            <p className="text-[11px] text-zinc-500 mb-3">
              Last 30 payments to bills
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={paymentsTrend}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    stroke="#3f3f46"
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
                    formatter={(v: number) => formatMoney(v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{ fill: "#34d399", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Upcoming Due */}
        {upcoming.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm font-semibold text-white">Upcoming due dates</p>
            <p className="text-[11px] text-zinc-500 mb-3">
              Next bills hitting your account
            </p>
            <div className="space-y-2">
              {upcoming.map(({ bill, amount, daysUntil }) => (
                <div
                  key={bill.id}
                  className="flex items-center gap-3 rounded-xl bg-zinc-900/50 border border-zinc-800 p-3"
                >
                  <BillLogo name={bill.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {bill.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Due day {bill.due_day} · {formatMoney(amount)}
                    </p>
                  </div>
                  <DueBadge days={daysUntil!} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter chips */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filterChips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                  filter === c.key
                    ? "bg-emerald-400 text-black border-emerald-400"
                    : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {c.label}
                <span
                  className={`ml-1.5 ${
                    filter === c.key ? "text-black/70" : "text-zinc-500"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            ))}
          </div>

          {/* Bill list */}
          <div className="grid gap-3 md:grid-cols-2">
            {filteredBills.map((b) => {
              const kind = classifyBill(b);
              const amount = getBillMonthlyAmount(b);
              const paid = billsWithPayments.get(b.id) || 0;
              const sinkingPct =
                kind === "sinking" && b.target && b.target > 0
                  ? Math.min(100, ((b.saved || 0) / b.target) * 100)
                  : null;

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:border-zinc-700 transition"
                >
                  <div className="flex items-start gap-3">
                    <BillLogo name={b.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">
                          {b.name}
                        </p>
                        <span
                          className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold shrink-0"
                          style={{
                            backgroundColor: `${kindColor(kind)}22`,
                            color: kindColor(kind),
                          }}
                        >
                          {kindLabel(kind)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {b.category || "Uncategorized"}
                        {b.due_day != null ? ` · Due day ${b.due_day}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="text-xl font-bold text-white">
                      {formatMoney(amount)}
                    </p>
                    {paid > 0 && (
                      <p className="text-[11px] text-emerald-400">
                        {formatMoney(paid)} paid
                      </p>
                    )}
                  </div>

                  {/* Sinking fund progress */}
                  {sinkingPct != null && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-400 transition-all duration-700"
                          style={{ width: `${sinkingPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {formatMoney(b.saved || 0)} of{" "}
                        {formatMoney(b.target || 0)} saved (
                        {Math.round(sinkingPct)}%)
                      </p>
                    </div>
                  )}

                  {/* Credit utilization */}
                  {kind === "credit" &&
                    b.balance != null &&
                    b.credit_limit != null &&
                    b.credit_limit > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-400 transition-all duration-700"
                            style={{
                              width: `${Math.min(
                                100,
                                (b.balance / b.credit_limit) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {formatMoney(b.balance)} of{" "}
                          {formatMoney(b.credit_limit)} (
                          {Math.round((b.balance / b.credit_limit) * 100)}%
                          utilization)
                        </p>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
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
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "text-white",
    success: "text-emerald-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
  };
  return (
    <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`text-lg font-semibold ${colors[tone]}`}>{value}</p>
    </div>
  );
}

/* ─────────────────────────────
   DUE BADGE
──────────────────────────── */
function DueBadge({ days }: { days: number }) {
  let tone = "bg-zinc-800 text-zinc-300";
  let label = `In ${days} days`;
  if (days === 0) {
    tone = "bg-red-500/20 text-red-300";
    label = "Today";
  } else if (days <= 3) {
    tone = "bg-orange-500/20 text-orange-300";
    label = `In ${days}d`;
  } else if (days <= 7) {
    tone = "bg-yellow-500/20 text-yellow-300";
    label = `In ${days}d`;
  } else {
    label = `In ${days}d`;
  }
  return (
    <span
      className={`text-[11px] font-semibold rounded-full px-2.5 py-1 shrink-0 ${tone}`}
    >
      {label}
    </span>
  );
}
