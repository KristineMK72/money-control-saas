"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ---------------- TYPES ---------------- */

type PaymentRow = {
  id: string;
  user_id: string;
  date_iso: string;
  merchant: string | null;
  amount: number;
  note: string | null;
  created_at: string;
  debt_id: string | null;
  bill_id: string | null;
};

type DebtRow = {
  id: string;
  name: string;
  remaining_balance: number | null;
};

type BillRow = {
  id: string;
  name: string;
  target: number;
};

/* ---------------- HELPERS ---------------- */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------- PAGE ---------------- */

export default function PaymentsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);

  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [payType, setPayType] = useState<"debt" | "bill">("debt");
  const [debtId, setDebtId] = useState("");
  const [billId, setBillId] = useState("");

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.session?.user;

    if (!user) {
      setMessage("Please log in.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadPayments(user.id),
      loadDebts(user.id),
      loadBills(user.id),
    ]);

    setLoading(false);
  }

  /* ---------------- LOADERS ---------------- */

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((data as PaymentRow[]) || []);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase
      .from("debt_status")
      .select("id, name, remaining_balance")
      .eq("user_id", uid)
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setDebts((data as DebtRow[]) || []);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("id, name, target")
      .eq("user_id", uid)
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((data as BillRow[]) || []);
  }

  async function refreshPayments() {
    if (!userId) return;
    await loadPayments(userId);
  }

  /* ---------------- ADD PAYMENT ---------------- */

  async function handleAddPayment() {
    setMessage("");

    if (!userId) return;

    const amt = Number(amount);

    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter valid name + amount.");
      return;
    }

    if (payType === "debt" && !debtId) {
      setMessage("Select a debt.");
      return;
    }

    if (payType === "bill" && !billId) {
      setMessage("Select a bill.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from("payments").insert({
        user_id: userId,
        date_iso: dateISO,
        amount: amt,
        merchant: merchant.trim(),
        note: note.trim() || null,
        debt_id: payType === "debt" ? debtId : null,
        bill_id: payType === "bill" ? billId : null,
      });

      if (error) throw error;

      // reset form
      setMerchant("");
      setAmount("");
      setNote("");
      setDebtId("");
      setBillId("");
      setPayType("debt");
      setDateISO(todayISO());

      await refreshPayments();
      setMessage("Payment added.");

    } catch (err: any) {
      setMessage(err.message || "Failed to add payment.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- TOTAL ---------------- */

  const total = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">

        <h1 className="text-4xl font-black">Payments</h1>

        {message && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
            {message}
          </div>
        )}

        <div className="mt-4 text-2xl font-bold">
          Total: ${total.toFixed(2)}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          {/* FORM */}
          <div className="rounded-2xl bg-white p-5 text-black">

            <h2 className="text-xl font-bold">Add Payment</h2>

            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="mt-3 w-full border p-2 rounded"
            />

            <input
              placeholder="What did you pay?"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="mt-3 w-full border p-2 rounded"
            />

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-3 w-full border p-2 rounded"
            />

            {/* TYPE */}
            <select
              value={payType}
              onChange={(e) => {
                setPayType(e.target.value as "debt" | "bill");
                setDebtId("");
                setBillId("");
              }}
              className="mt-3 w-full border p-2 rounded"
            >
              <option value="debt">Debt</option>
              <option value="bill">Bill</option>
            </select>

            {/* DEBT DROPDOWN */}
            {payType === "debt" && (
              <select
                value={debtId}
                onChange={(e) => setDebtId(e.target.value)}
                className="mt-3 w-full border p-2 rounded"
              >
                <option value="">Select debt</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* BILL DROPDOWN */}
            {payType === "bill" && (
              <select
                value={billId}
                onChange={(e) => setBillId(e.target.value)}
                className="mt-3 w-full border p-2 rounded"
              >
                <option value="">Select bill</option>
                {bills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — ${b.target}
                  </option>
                ))}
              </select>
            )}

            <textarea
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-3 w-full border p-2 rounded"
            />

            <button
              onClick={handleAddPayment}
              disabled={saving}
              className="mt-4 w-full bg-black text-white p-3 rounded"
            >
              {saving ? "Saving..." : "Add Payment"}
            </button>

          </div>

          {/* HISTORY */}
          <div className="rounded-2xl bg-white p-5 text-black">

            <h2 className="text-xl font-bold">History</h2>

            {payments.length === 0 ? (
              <p className="mt-3">No payments yet.</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="border-b py-2">
                  <div className="font-semibold">
                    {p.merchant} — ${p.amount}
                  </div>
                  <div className="text-sm text-gray-500">
                    {p.date_iso}
                  </div>
                </div>
              ))
            )}

          </div>

        </div>
      </div>
    </main>
  );
}
