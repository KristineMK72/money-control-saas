"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import BenBubble from "@/components/BenBubble";

/* ─────────────────────────────
   TYPES
──────────────────────────── */
type Bill = {
  id: string;
  name: string;
  user_id: string;
};

type Debt = {
  id: string;
  name: string;
  user_id: string;
};

type Payment = {
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

type TargetType = "bill" | "debt";

/* ─────────────────────────────
   HELPERS
──────────────────────────── */
function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function isSameMonth(d: Date, ref: Date) {
  return (
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  );
}

function monthKey(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function guessDomain(name: string): string {
  if (!name) return "";
  const n = name.toLowerCase().trim();
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
    "capital one": "capitalone.com",
    capitalone: "capitalone.com",
    chase: "chase.com",
    discover: "discover.com",
    amex: "americanexpress.com",
    "american express": "americanexpress.com",
    aspire: "aspirecard.com",
    aspire1: "aspirecard.com",
    "home choice": "homechoice.com",
    homechoice: "homechoice.com",
  };
  if (map[n] != null) return map[n];
  const slug = n.replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : "";
}

function MerchantLogo({ name }: { name: string }) {
  const domain = guessDomain(name);
  const [failed, setFailed] = useState(!domain);

  if (failed || !domain) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt=""
      className="w-9 h-9 rounded-lg object-contain bg-white p-1 shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

/* ─────────────────────────────
   PAGE
──────────────────────────── */
export default function PaymentsPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Payment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("bill");
  const [targetId, setTargetId] = useState<string>("");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitial() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const userId = user.id;
    const [{ data: debtsData }, { data: billsData }, { data: paymentsData }] =
      await Promise.all([
        supabase.from("debts").select("id,name,user_id").eq("user_id", userId),
        supabase.from("bills").select("id,name,user_id").eq("user_id", userId),
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", userId)
          .order("date_iso", { ascending: false }),
      ]);

    setDebts((debtsData || []) as Debt[]);
    setBills((billsData || []) as Bill[]);
    setHistory((paymentsData || []) as Payment[]);
    setLoading(false);
  }

  async function handleAddPayment() {
    setErrorMsg("");

    if (!amount || Number(amount) <= 0) {
      setErrorMsg("Enter a valid amount.");
      return;
    }
    if (!targetId) {
      setErrorMsg(`Select a ${targetType}.`);
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("You must be logged in.");
      setSaving(false);
      return;
    }

    const billName =
      targetType === "bill" ? bills.find((b) => b.id === targetId)?.name : null;
    const debtName =
      targetType === "debt" ? debts.find((d) => d.id === targetId)?.name : null;

    const merchantToSave =
      merchant.trim() !== "" ? merchant.trim() : billName || debtName || null;

    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      date_iso: date,
      merchant: merchantToSave,
      amount: Number(amount),
      note: note.trim() || null,
      debt_id: targetType === "debt" ? targetId : null,
      bill_id: targetType === "bill" ? targetId : null,
    });

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setMerchant("");
    setAmount("");
    setNote("");
    setTargetId("");
    setShowForm(false);
    await loadInitial();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payment?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setHistory((h) => h.filter((p) => p.id !== id));
  }

  /* ───── Stats ───── */
  const today = new Date();

  const monthTotal = useMemo(
    () =>
      history.reduce((sum, p) => {
        const d = new Date(p.date_iso);
        return !isNaN(d.getTime()) && isSameMonth(d, today)
          ? sum + Number(p.amount || 0)
          : sum;
      }, 0),
    [history]
  );

  const monthCount = useMemo(
    () =>
      history.filter((p) => {
        const d = new Date(p.date_iso);
        return !isNaN(d.getTime()) && isSameMonth(d, today);
      }).length,
    [history]
  );

  const biggestThisMonth = useMemo(() => {
    const monthly = history.filter((p) => {
      const d = new Date(p.date_iso);
      return !isNaN(d.getTime()) && isSameMonth(d, today);
    });
    if (!monthly.length) return null;
    return monthly.reduce((max, p) => (p.amount > max.amount ? p : max));
  }, [history]);

  /* ───── Filtered + grouped history ───── */
  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (p) =>
        (p.merchant || "").toLowerCase().includes(q) ||
        (p.note || "").toLowerCase().includes(q)
    );
  }, [history, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, Payment[]>();
    for (const p of filteredHistory) {
      const k = monthKey(p.date_iso);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return Array.from(m.entries());
  }, [filteredHistory]);

  /* ───── Recent merchants for quick-add ───── */
  const recentMerchants = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of history) {
      const name = (p.merchant || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(name);
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [history]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-zinc-500">Loading payments…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-8 pb-24">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Payments
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Log payments toward bills and debts. Ben tracks the rest.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm((s) => !s);
              setErrorMsg("");
            }}
            className="self-start md:self-auto rounded-full bg-emerald-400 text-black font-semibold px-4 py-2 text-sm hover:bg-emerald-300 transition"
          >
            {showForm ? "Cancel" : "+ Add payment"}
          </button>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              This month
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatMoney(monthTotal)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Payments
            </p>
            <p className="text-2xl font-bold text-white mt-1">{monthCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Biggest
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {biggestThisMonth ? formatMoney(biggestThisMonth.amount) : "—"}
            </p>
            {biggestThisMonth?.merchant && (
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {biggestThisMonth.merchant}
              </p>
            )}
          </div>
        </section>

        {/* Ben Bubble */}
        {!showForm && (
          <BenBubble
            text={
              monthCount === 0
                ? "Log your first payment of the month and I'll start tracking your pace."
                : `Nice — ${monthCount} payment${
                    monthCount === 1 ? "" : "s"
                  } logged this month, totaling ${formatMoney(monthTotal)}.`
            }
            mood="encouraging"
          />
        )}

        {/* Add Form */}
        {showForm && (
          <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/70 p-5 space-y-4">
            <p className="text-sm font-semibold text-white">New payment</p>

            {/* Target type toggle */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-full p-1 text-xs w-fit">
              {(["bill", "debt"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTargetType(t);
                    setTargetId("");
                  }}
                  className={`rounded-full px-3 py-1.5 transition ${
                    targetType === t
                      ? "bg-emerald-400 text-black font-semibold"
                      : "text-zinc-400"
                  }`}
                >
                  {t === "bill" ? "Bill" : "Debt"}
                </button>
              ))}
            </div>

            {/* Target picker as cards */}
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">
                Which {targetType}?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {(targetType === "bill" ? bills : debts).map((item) => {
                  const selected = targetId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setTargetId(item.id);
                        if (!merchant) setMerchant(item.name);
                      }}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                        selected
                          ? "border-emerald-400 bg-emerald-400/10"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                      }`}
                    >
                      <MerchantLogo name={item.name} />
                      <span className="text-xs text-white truncate">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
                {(targetType === "bill" ? bills : debts).length === 0 && (
                  <p className="text-xs text-zinc-500 col-span-full">
                    No {targetType}s yet. Add one first.
                  </p>
                )}
              </div>
            </div>

            {/* Quick merchant chips */}
            {recentMerchants.length > 0 && (
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">
                  Recent
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {recentMerchants.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMerchant(m)}
                      className="text-[11px] rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-1 hover:border-zinc-500 transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount + Date */}
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Merchant override */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">
                Merchant <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Auto-filled from selection"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">
                Note <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., paid extra to lower interest"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleAddPayment}
              disabled={saving}
              className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold py-2.5 text-sm transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save payment"}
            </button>
          </section>
        )}

        {/* Search */}
        {history.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payments by merchant or note…"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>
        )}

        {/* History grouped by month */}
        <section className="space-y-6">
          {grouped.length === 0 && history.length > 0 && (
            <p className="text-xs text-zinc-500 text-center py-6">
              No payments match "{search}".
            </p>
          )}

          {history.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="text-5xl">💸</div>
              <p className="text-sm text-zinc-400">
                No payments logged yet. Tap "Add payment" to get started.
              </p>
            </div>
          )}

          {grouped.map(([month, items]) => {
            const total = items.reduce((s, p) => s + Number(p.amount || 0), 0);
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
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 hover:border-zinc-700 transition"
                    >
                      <MerchantLogo name={p.merchant || ""} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {p.merchant || "Payment"}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {new Date(p.date_iso).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {p.note ? ` · ${p.note}` : ""}
                          {p.bill_id ? " · Bill" : ""}
                          {p.debt_id ? " · Debt" : ""}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-white shrink-0">
                        {formatMoney(Number(p.amount))}
                      </p>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition text-xs"
                        aria-label="Delete payment"
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
