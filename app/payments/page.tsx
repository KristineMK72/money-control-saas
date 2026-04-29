"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import BenBubble from "@/components/BenBubble";
import BenPersona from "@/components/BenPersona";

export default function PaymentsPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [debts, setDebts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitial() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const userId = user.id;

    const [{ data: debtsData }, { data: billsData }, { data: paymentsData }] =
      await Promise.all([
        supabase.from("debts").select("*").eq("user_id", userId),
        supabase.from("bills").select("*").eq("user_id", userId),
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", userId)
          .order("date_iso", { ascending: false }),
      ]);

    setDebts(debtsData || []);
    setBills(billsData || []);
    setHistory(paymentsData || []);
  }

  async function handleAddPayment() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const userId = user.id;

    if (!amount || Number(amount) <= 0) {
      alert("Enter a valid amount.");
      setLoading(false);
      return;
    }

    if (!selectedDebtId && !selectedBillId) {
      alert("Select a debt or bill.");
      setLoading(false);
      return;
    }

    const billName = bills.find((b) => b.id === selectedBillId)?.name;
    const debtName = debts.find((d) => d.id === selectedDebtId)?.name;

    const merchantToSave =
      merchant.trim() !== "" ? merchant : billName || debtName || null;

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      date_iso: date,
      merchant: merchantToSave,
      amount: Number(amount),
      note: note || null,
      debt_id: selectedDebtId || null,
      bill_id: selectedBillId || null,
    });

    if (error) {
      console.error("Payment insert error:", error);
      alert("Error saving payment: " + error.message);
      setLoading(false);
      return;
    }

    await loadInitial();

    setMerchant("");
    setAmount("");
    setNote("");
    setSelectedDebtId(null);
    setSelectedBillId(null);

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-10 pb-24">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Add Payment</h1>
          <p className="text-xs text-zinc-400">
            Log payments toward debts or bills.
          </p>
        </header>

        <BenBubble
          text="Let's log your payment and keep your month on track."
          mood="encouraging"
        />

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-xs text-zinc-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs text-zinc-400">What did you pay?</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g., Capital One"
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs text-zinc-400">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs text-zinc-400">Debt</label>
            <select
              value={selectedDebtId || ""}
              onChange={(e) => {
                setSelectedDebtId(e.target.value || null);
                setSelectedBillId(null);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select debt</option>
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs text-zinc-400">Bill</label>
            <select
              value={selectedBillId || ""}
              onChange={(e) => {
                setSelectedBillId(e.target.value || null);
                setSelectedDebtId(null);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select bill</option>
              {bills.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs text-zinc-400">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleAddPayment}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-2 text-sm"
          >
            {loading ? "Saving..." : "Add Payment"}
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">History</h2>

          {history.length === 0 ? (
            <p className="text-xs text-zinc-500">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
                >
                  <div>
                    <div className="text-sm text-white">
                      {p.merchant || "Payment"} — ${p.amount}
                    </div>
                    <div className="text-[11px] text-zinc-500">{p.date_iso}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <BenPersona />
        </section>
      </div>
    </main>
  );
}
