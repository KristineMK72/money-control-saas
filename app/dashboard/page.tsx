"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoneyStore, getTotals } from "@/lib/money/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import EnableNotificationsButton from "@/components/EnableNotificationsButton";

type BillRow = { /* keep your existing BillRow type */ };
type DebtRow = { /* keep your existing DebtRow type */ };
type SideHustleRow = { /* keep your existing SideHustleRow type */ };

/* Keep all your helper functions exactly as they are */
function startOfToday() { /* ... */ }
function endOfWindow(daysFromNow: number) { /* ... */ }
function parseDateSafe(dateISO?: string | null) { /* ... */ }
function getNextDueDateFromDay(dueDay?: number | null) { /* ... */ }
function effectiveBillDueDate(bill: BillRow) { /* ... */ }
function effectiveBillAmount(bill: BillRow) { /* ... */ }
function effectiveDebtDueDate(debt: DebtRow) { /* ... */ }
function effectiveDebtAmount(debt: DebtRow) { /* ... */ }
function effectiveDebtBalance(debt: DebtRow) { /* ... */ }
function daysUntil(dateISO?: string | null) { /* ... */ }
function scoreItem(item: Omit<PriorityItem, "score">) { /* ... */ }
function formatUSD(n: number) { /* ... */ }
function formatDueLabel(dateISO?: string | null) { /* ... */ }

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = goal <= 0 ? 100 : Math.min(100, Math.max(0, (current / goal) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-500">Goal progress</span>
        <span className="font-semibold text-zinc-950">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const { payments, debts: storeDebts, addPayment, removeDebt /* add any other actions you need */ } = useMoneyStore();
  const totals = getTotals();   // Fresh totals from Zustand

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bills, setBills] = useState<BillRow[]>([]);
  const [sideHustles, setSideHustles] = useState<SideHustleRow[]>([]);

  // Load auth + profile + side hustles + any extra Supabase-only data
  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setMessage("");

      const { data: { user }, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !user) {
        setMessage(error?.message || "Please log in to view your dashboard.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [profileRes, billsRes, hustlesRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("bills").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("side_hustles").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      if (profileRes.data?.display_name) setName(profileRes.data.display_name);
      if (billsRes.data) setBills(billsRes.data as BillRow[]);
      if (hustlesRes.data) setSideHustles(hustlesRes.data as SideHustleRow[]);

      setLoading(false);
    }

    loadDashboard();
    return () => { mounted = false; };
  }, [supabase]);

  // Your rich derived calculations stay here (now using storeDebts + store payments)
  const priorities = useMemo(() => { /* your existing priorities logic using bills + storeDebts */ }, [bills, storeDebts]);
  const dueSoon = useMemo(() => { /* your existing dueSoon logic */ }, [bills, storeDebts]);
  const stress = useMemo(() => { /* your existing stress logic using totals + other values */ }, [totals, /* other deps */]);
  const insights = useMemo(() => { /* your existing insights */ }, [/* deps */]);
  const plannedIncome = useMemo(() => {
    return sideHustles.reduce((sum, row) => sum + Number(row.rate || 0) * Number(row.planned_quantity || 0), 0);
  }, [sideHustles]);

  const weekEnd = endOfWindow(6);
  const billsThisWeekTotal = /* your existing logic */;
  const debtThisWeekTotal = /* your existing logic */;
  const gapThisWeek = Math.max(0, billsThisWeekTotal + debtThisWeekTotal + totals.spending + totals.payments - totals.income);
  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);

  if (loading) {
    return <main className="min-h-screen bg-black px-6 py-10 text-white">Loading dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 shadow-2xl md:p-8">
          {/* Header - unchanged */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Money Command Center
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                {name ? `Welcome back, ${name}` : "Dashboard"}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                One place to see risk, due dates, priorities, and momentum.
              </p>
              <div className="mt-4">
                <EnableNotificationsButton />
              </div>
            </div>

            {/* Navigation buttons unchanged */}
            <div className="flex flex-wrap gap-3">
              {/* ... your links to /bills, /debt, /forecast, etc. */}
            </div>
          </div>

          {/* Stat cards - now using Zustand totals */}
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Income" value={formatUSD(totals.income)} />
            <StatCard label="Spending" value={formatUSD(totals.spending)} />
            <StatCard label="Payments / Bills" value={formatUSD(totals.payments)} />
            <StatCard label="Remaining" value={formatUSD(totals.income - totals.spending - totals.payments)} />
          </div>

          {/* Stress, Due Next 7 Days, Total Debt cards - update to use store data */}
          {/* Priorities, Upcoming due dates, Ben Insights, Close the Gap, Quick Actions sections remain similar */}
          {/* Just replace any old totals with `totals.xxx` and old debts/payments arrays with `storeDebts` / `payments` where needed */}

          {/* Example: Quick actions can now call store actions directly */}
          <div className="mt-8 ...">
            <button 
              onClick={() => { /* example: open modal or navigate + addPayment */ }}
              className="..."
            >
              Add Payment
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
