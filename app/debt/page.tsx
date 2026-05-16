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
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  apr: number | null;
  credit_limit: number | null;
  note: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  created_at: string;
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const shellClass = "rounded-[2rem] border border-white/20 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-md md:p-8";
const cardClass = "rounded-2xl border border-white/60 bg-white/97 p-6 shadow-2xl backdrop-blur-xl";

export default function DebtPage() {
  const supabase = createSupabaseBrowserClient();

  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Add debt form
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [kind, setKind] = useState<"credit" | "loan">("credit");
  const [dueDate, setDueDate] = useState("");

  // Screenshot upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data } = await supabase.from("debts").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setDebts((data || []) as DebtRow[]);
  }

  async function loadPayments(uid: string) {
    const { data } = await supabase.from("payments").select("*").eq("user_id", uid);
    setPayments(data || []);
  }

  async function scanDebtImage(file: File | null) {
    if (!file) return;
    setScanning(true);
    try {
      const { text } = await ocrImageFile(file);
      const parsed = parseTransactionsScreenshot(text);
      const first = parsed[0];
      if (first) {
        setName(first.merchant || "");
        if (first.amount) setBalance(String(first.amount));
        setMessage("Ben auto-filled what he could. Review and add.");
      }
    } catch (err) {
      setMessage("Scanner had trouble. You can still enter manually.");
    }
    setScanning(false);
  }

  async function addDebt() {
    if (!userId) return;
    const bal = Number(balance);
    if (!name.trim() || !bal || bal <= 0) {
      setMessage("Name and valid balance required.");
      return;
    }
    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name: name.trim(),
      kind,
      balance: bal,
      min_payment: Number(minPayment) || null,
      due_date: dueDate || null,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("Debt added successfully.");
      setName("");
      setBalance("");
      setMinPayment("");
      setDueDate("");
      await loadDebts(userId);
    }
  }

  const totals = useMemo(() => {
    const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0);
    const totalMin = debts.reduce((sum, d) => sum + Number(d.monthly_min_payment || d.min_payment || 0), 0);
    return { totalBalance, totalMin };
  }, [debts]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Debt Overview",
    totalNeeded: totals.totalMin,
    incomeSoFar: 0,
    incomeGap: totals.totalMin,
    dailyIncomeNeeded: Math.ceil(totals.totalMin / 30),
  });

  if (loading) return <div className="p-8 text-center">Loading debts...</div>;

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-5xl space-y-8`}>
        <header>
          <h1 className="text-5xl font-black text-white">Debt</h1>
          <p className="mt-2 text-lg text-white/80">Track what you owe and stay in control.</p>
        </header>

        {/* Ben Insight */}
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 shadow-xl">
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Debt" value={money(totals.totalBalance)} />
          <StatCard label="Monthly Minimums" value={money(totals.totalMin)} />
          <StatCard label="Accounts" value={debts.length.toString()} plain />
        </div>

        {/* Paper Scroll Scanner */}
        <section className="rounded-3xl border border-white/20 bg-black/50 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-5xl">📜</div>
            <div>
              <h2 className="text-2xl font-black">Scan Debt Statement</h2>
              <p className="text-white/75">Upload a credit card statement, loan summary, or screenshot</p>
            </div>
          </div>

          <label className="block cursor-pointer rounded-3xl border border-dashed border-amber-400/50 bg-gradient-to-br from-amber-950/70 to-black/60 p-12 text-center hover:border-amber-400 transition">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <div className="mx-auto mb-4 text-7xl">📜</div>
            <p className="text-xl font-black text-amber-100">
              {imageFile ? imageFile.name : "Tap to upload statement or screenshot"}
            </p>
          </label>

          <button
            onClick={() => scanDebtImage(imageFile)}
            disabled={!imageFile || scanning}
            className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan with Ben"}
          </button>
        </section>

        {/* Add Debt Form */}
        <section className={cardClass}>
          <h2 className="text-2xl font-black mb-6">Add New Debt</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input placeholder="Debt name (Chase Visa, Car Loan...)" value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950" />
            <input placeholder="Current Balance" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} className="rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950" />
            <input placeholder="Monthly Minimum" inputMode="decimal" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} className="rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950" />
            <select value={kind} onChange={(e) => setKind(e.target.value as "credit" | "loan")} className="rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950">
              <option value="credit">Credit Card</option>
              <option value="loan">Loan</option>
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950 md:col-span-2" />
          </div>
          <button onClick={addDebt} className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-black text-white hover:bg-emerald-700">
            Add Debt
          </button>
        </section>

        {/* Debt List */}
        <section className="space-y-4">
          {debts.map((debt) => (
            <div key={debt.id} className={cardClass}>
              {/* Your existing debt card content - I can expand this further if you want */}
              <div className="flex justify-between">
                <div>
                  <h3 className="font-black text-xl">{debt.name}</h3>
                  <p className="text-sm text-zinc-600">{debt.kind}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">{money(debt.balance)}</p>
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

function StatCard({ label, value, plain = false }: { label: string; value: number | string; plain?: boolean }) {
  return (
    <div className={cardClass}>
      <div className="text-sm font-black uppercase tracking-widest text-zinc-600">{label}</div>
      <div className="mt-3 text-4xl font-black text-zinc-950">
        {plain ? value : money(Number(value))}
      </div>
    </div>
  );
}
