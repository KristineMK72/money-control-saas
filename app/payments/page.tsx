"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PaymentRow = {
  id: string;
  user_id: string;
  date_iso: string;
  amount: number;
  merchant: string | null;
  note: string | null;
  debt_id?: string | null;
  bill_id?: string | null;
  created_at: string;
};

type DebtRow = {
  id: string;
  name: string;
  remaining_balance?: number | null;
};

type BillRow = {
  id: string;
  name: string;
  amount?: number | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaymentsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);

  // form state
  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // NEW: type + selection
  const [payType, setPayType] = useState<"debt" | "bill">("debt");
  const [debtId, setDebtId] = useState("");
  const [billId, setBillId] = useState("");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/signup");
    router.refresh();
  }

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false });

    if (error) throw error;
    setPayments((data || []) as PaymentRow[]);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase
      .from("debt_status")
      .select("id, name, remaining_balance")
      .eq("user_id", uid)
      .order("name", { ascending: true });

    if (error) throw error;
    setDebts((data || []) as DebtRow[]);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("buckets")
      .select("id, name, amount")
      .eq("user_id", uid)
      .eq("kind", "bill")
      .order("name", { ascending: true });

    if (error) throw error;
    setBills((data || []) as BillRow[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const session = data.session;
      if (!session?.user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      const uid = session.user.id;
      setUserId(uid);

      await Promise.all([
        loadPayments(uid),
        loadDebts(uid),
        loadBills(uid),
      ]);

      setLoading(false);
    }

    init();
  }, []);

  async function refresh() {
    if (!userId) return;
    await loadPayments(userId);
  }

  async function handleAddPayment() {
    setMessage("");

    if (!userId) return;

    const amt = Number(amount);
    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid payment and amount.");
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

      const payload = {
        user_id: userId,
        date_iso: dateISO,
        amount: amt,
        merchant: merchant.trim(),
        note: note.trim() || null,
        debt_id: payType === "debt" ? debtId : null,
        bill_id: payType === "bill" ? billId : null,
      };

      const { error } = await supabase.from("payments").insert(payload);
      if (error) throw error;

      setDateISO(todayISO());
      setMerchant("");
      setAmount("");
      setNote("");
      setDebtId("");
      setBillId("");
      setPayType("debt");

      await refresh();
      setMessage("Payment added.");
    } catch (err: any) {
      setMessage(err.message || "Failed to add payment.");
    } finally {
      setSaving(false);
    }
  }

  const total = useMemo(
    () => payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [payments]
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">

        <h1 className="text-4xl font-black">Payments</h1>
        <p className="text-zinc-400 mt-2">
          Log payments toward debt or bills.
        </p>

        {message && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
            {message}
          </div>
        )}

        {/* SUMMARY */}
        <div className="mt-6 text-2xl font-bold">
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
              placeholder="What was this payment for?"
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

            {/* TYPE SELECT */}
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

            {/* CONDITIONAL DROPDOWN */}
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

            {payType === "bill" && (
              <select
                value={billId}
                onChange={(e) => setBillId(e.target.value)}
                className="mt-3 w-full border p-2 rounded"
              >
                <option value="">Select bill</option>
                {bills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.amount ? ` - $${b.amount}` : ""}
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

            {loading ? (
              <p>Loading...</p>
            ) : payments.length === 0 ? (
              <p>No payments yet.</p>
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
