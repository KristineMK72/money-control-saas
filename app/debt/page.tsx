"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number | string | null;
  min_payment: number | string | null;
  monthly_min_payment: number | string | null;
  due_date: string | null;
  apr: number | string | null;
  credit_limit: number | string | null;
  note: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  created_at: string;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return num(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const shellClass =
  "rounded-2xl border border-white/40 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl md:p-8";

const cardClass =
  "rounded-2xl border border-white/80 bg-white/95 p-6 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl";

export default function DebtPage() {
  const supabase = createSupabaseBrowserClient();

  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [kind, setKind] = useState<"credit" | "loan">("credit");
  const [dueDate, setDueDate] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please log in to view your debt.");
      setLoading(false);
      return;
    }

    setUserId(user.id);
    await Promise.all([loadDebts(user.id), loadPayments(user.id)]);
    setLoading(false);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setDebts([]);
      return;
    }

    setDebts((data || []) as DebtRow[]);
  }

  async function loadPayments(uid: string) {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid);

    setPayments(data || []);
  }

  async function scanDebtImage(file: File | null) {
    if (!file) return;

    setScanning(true);
    setMessage("");

    try {
      const { text } = await ocrImageFile(file);
      const parsed = parseTransactionsScreenshot(text);
      const first = parsed?.[0];

      if (first) {
        setName(first.merchant || "");

        if (num(first.amount) > 0) {
          setBalance(String(first.amount));
        }

        setMessage("Ben auto-filled what he could. Review and add.");
      } else {
        setMessage("Ben could not find debt details. You can still enter manually.");
      }
    } catch {
      setMessage("Scanner had trouble. You can still enter manually.");
    }

    setScanning(false);
  }

  async function addDebt() {
    if (!userId) return;

    const bal = num(balance);
    const min = num(minPayment);

    if (!name.trim() || bal <= 0) {
      setMessage("Name and valid balance required.");
      return;
    }

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name: name.trim(),
      kind,
      balance: bal,
      min_payment: min > 0 ? min : null,
      monthly_min_payment: min > 0 ? min : null,
      due_date: dueDate || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Debt added successfully.");
    setName("");
    setBalance("");
    setMinPayment("");
    setDueDate("");

    await loadDebts(userId);
  }

  const totals = useMemo(() => {
    const totalBalance = debts.reduce((sum, debt) => {
      return sum + num(debt.balance);
    }, 0);

    const totalMin = debts.reduce((sum, debt) => {
      return sum + num(debt.monthly_min_payment ?? debt.min_payment);
    }, 0);

    return {
      totalBalance,
      totalMin,
      accountCount: debts.length,
    };
  }, [debts]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Debt Overview",
    totalNeeded: totals.totalMin,
    incomeSoFar: 0,
    incomeGap: totals.totalMin,
    dailyIncomeNeeded: Math.ceil(totals.totalMin / 30),
  });

  if (loading) {
    return <div className="p-8 text-center">Loading debts...</div>;
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-5xl space-y-8`}>
        <header>
          <h1 className="text-5xl font-black text-white">Debt</h1>
          <p className="mt-2 text-lg font-semibold text-white/90">
            Track what you owe and stay in control.
          </p>
        </header>

        {message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-4 text-sm font-bold text-amber-950 shadow-xl">
            {message}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/20 bg-slate-950/80 p-6 shadow-xl backdrop-blur-xl">
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Debt" value={totals.totalBalance} />
          <StatCard label="Monthly Minimums" value={totals.totalMin} />
          <StatCard label="Accounts" value={totals.accountCount} plain />
        </div>

        <section className={cardClass}>
          <div className="mb-6 flex items-start gap-4">
            <div className="text-5xl">📜</div>
            <div>
              <h2 className="text-2xl font-black">Scan Debt Statement</h2>
              <p className="text-sm font-semibold text-zinc-700">
                Upload a credit card statement, loan summary, or screenshot.
              </p>
            </div>
          </div>

          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/90 p-8 text-center shadow-inner transition hover:bg-amber-50">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />

            <div className="mx-auto mb-4 text-7xl">📜</div>

            <p className="text-xl font-black text-amber-950">
              {imageFile
                ? imageFile.name
                : "Tap to upload statement or screenshot"}
            </p>
          </label>

          <button
            onClick={() => void scanDebtImage(imageFile)}
            disabled={!imageFile || scanning}
            className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan with Ben"}
          </button>
        </section>

        <section className={cardClass}>
          <h2 className="mb-6 text-2xl font-black">Add New Debt</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Debt name (Chase Visa, Car Loan...)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl border border-zinc-300 bg-white/95 px-5 py-3.5 text-zinc-950 shadow-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <input
              placeholder="Current Balance"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="rounded-2xl border border-zinc-300 bg-white/95 px-5 py-3.5 text-zinc-950 shadow-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <input
              placeholder="Monthly Minimum"
              inputMode="decimal"
              value={minPayment}
              onChange={(e) => setMinPayment(e.target.value)}
              className="rounded-2xl border border-zinc-300 bg-white/95 px-5 py-3.5 text-zinc-950 shadow-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "credit" | "loan")}
              className="rounded-2xl border border-zinc-300 bg-white/95 px-5 py-3.5 text-zinc-950 shadow-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="credit">Credit Card</option>
              <option value="loan">Loan</option>
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-2xl border border-zinc-300 bg-white/95 px-5 py-3.5 text-zinc-950 shadow-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:col-span-2"
            />
          </div>

          <button
            onClick={() => void addDebt()}
            className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-black text-white hover:bg-emerald-700"
          >
            Add Debt
          </button>
        </section>

        <section className="space-y-4">
          {debts.map((debt) => (
            <div key={debt.id} className={cardClass}>
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">{debt.name}</h3>
                  <p className="text-sm capitalize text-zinc-600">
                    {debt.kind}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-zinc-500">
                    Minimum:{" "}
                    {money(debt.monthly_min_payment ?? debt.min_payment)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black">
                    {money(debt.balance)}
                  </p>
                  <p className="text-sm text-zinc-500">balance</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  plain = false,
}: {
  label: string;
  value: number | string;
  plain?: boolean;
}) {
  return (
    <div className={cardClass}>
      <div className="text-sm font-black uppercase tracking-widest text-zinc-600">
        {label}
      </div>

      <div className="mt-3 text-4xl font-black text-zinc-950">
        {plain ? value : money(value)}
      </div>
    </div>
  );
}
