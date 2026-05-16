"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import BenBubble from "@/components/BenBubble";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  target: number;
  category: string | null;
  due_date: string | null;
  due_day: number | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  bill_id: string | null;
  date_iso: string;
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

export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [dueDate, setDueDate] = useState("");

  // Scanner
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  // Expandable groups
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setMessage("Please log in.");
      setLoading(false);
      return;
    }
    setUserId(user.id);
    await Promise.all([loadBills(user.id), loadPayments(user.id)]);
    setLoading(false);
  }

  async function loadBills(uid: string) {
    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setBills((data as BillRow[]) || []);
  }

  async function loadPayments(uid: string) {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid);
    setPayments((data as PaymentRow[]) || []);
  }

  // ... (scanBillImage, addBill functions remain similar - let me know if you want them updated)

  const totalBills = bills.reduce((sum, b) => sum + Number(b.target || 0), 0);
  const totalPaidThisMonth = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Group bills by month for expandable list
  const billsByMonth = useMemo(() => {
    const groups: Record<string, BillRow[]> = {};
    bills.forEach(bill => {
      const monthKey = bill.created_at?.slice(0, 7) || "9999-99"; // YYYY-MM
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(bill);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)); // newest first
  }, [bills]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // Ben Insight
  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Bills",
    totalNeeded: totalBills,
    incomeSoFar: 0, // you can pass real income if available
    incomeGap: Math.max(0, totalBills - totalPaidThisMonth),
    dailyIncomeNeeded: 0,
  });

  if (loading) {
    return <div className="p-8 text-center">Loading bills...</div>;
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-5xl space-y-8`}>
        <header>
          <h1 className="text-5xl font-black text-white">Bills</h1>
          <p className="text-white/80">Stay on top of what you owe.</p>
        </header>

        {/* BenBubble Insight */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl">
          <BenBubble message={ben.text} mood={ben.mood} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <MiniStat label="Total Owed" value={money(totalBills)} />
          <MiniStat label="Paid This Month" value={money(totalPaidThisMonth)} />
          <MiniStat label="Active Bills" value={bills.length.toString()} />
        </div>

        {/* Paper Scroll Scanner */}
        <section className="rounded-3xl border border-white/20 bg-black/50 p-8 shadow-2xl backdrop-blur-xl">
          {/* ... your nice paper scroll upload area ... */}
        </section>

        {/* Add Bill Form */}
        <section className="rounded-3xl border border-white/20 bg-black/50 p-8 shadow-2xl backdrop-blur-xl">
          {/* ... clean form ... */}
        </section>

        {/* Expandable Bills by Month */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white">Your Bills</h2>
          
          {billsByMonth.length === 0 ? (
            <div className={cardClass}>No bills yet.</div>
          ) : (
            billsByMonth.map(([monthKey, monthBills]) => {
              const isExpanded = expandedMonths[monthKey] ?? true;
              return (
                <div key={monthKey} className={cardClass}>
                  <button
                    onClick={() => toggleMonth(monthKey)}
                    className="w-full flex justify-between items-center text-left"
                  >
                    <div>
                      <span className="font-black text-lg">
                        {new Date(monthKey + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <span className="ml-3 text-sm text-zinc-500">
                        {monthBills.length} bills
                      </span>
                    </div>
                    <span className="text-xl">{isExpanded ? "−" : "+"}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {monthBills.map(bill => (
                        <div key={bill.id} className="rounded-xl border border-white/40 bg-white/80 p-4 text-zinc-950">
                          <div className="flex justify-between">
                            <div>
                              <div className="font-semibold">{bill.name}</div>
                              <div className="text-sm text-zinc-600">{bill.category}</div>
                            </div>
                            <div className="text-right font-black text-xl">
                              {money(bill.target)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/97 p-6 shadow-2xl backdrop-blur-xl">
      <div className="uppercase tracking-widest text-xs text-zinc-600 font-black">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
