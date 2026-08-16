"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DebtZeroCeremony from "@/components/DebtZeroCeremony";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clampMoney, money } from "@/lib/money/math";
import { todayISO } from "@/lib/money/utils";
import { playError, playCashRegister, playLevelUp, playXpGain } from "@/lib/sounds";
import { awardXpForPayment } from "@/lib/awardXp";
import { getLevelReward } from "@/lib/progression";

type PaymentRow = {
  id: string;
  date_iso: string;
  merchant: string | null;
  amount: number | string | null;
  debt_id: string | null;
  bill_id: string | null;
};
type DebtRow = { id: string; name: string; balance: number | string | null };
type BillRow = { id: string; name: string };

export default function PaymentsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [msgOk, setMsgOk] = useState(true);
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
  const [ceremony, setCeremony] = useState<{ debtName: string; amountPaid: number } | null>(null);

  function notify(msg: string, ok = true) {
    setMessage(msg);
    setMsgOk(ok);
    window.setTimeout(() => setMessage(""), 6000);
  }

  async function reload(uid: string) {
    const [p, d, b] = await Promise.all([
      supabase
        .from("payments")
        .select("id, date_iso, merchant, amount, debt_id, bill_id")
        .eq("user_id", uid)
        .order("date_iso", { ascending: false })
        .limit(40),
      supabase.from("debts").select("id, name, balance").eq("user_id", uid).order("name"),
      supabase.from("bills").select("id, name").eq("user_id", uid).order("name"),
    ]);
    if (p.data) setPayments(p.data);
    if (d.data) setDebts(d.data);
    if (b.data) setBills(b.data);
  }

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        notify("Sign in to record payments.", false);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      await reload(user.id);
      setLoading(false);
    })();
  }, [supabase]);

  async function handleDeletePayment(paymentId: string) {
    if (!userId) return;
    const ok = window.confirm("Remove this payment from the ledger?");
    if (!ok) return;

    setDeletingId(paymentId);
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", userId);

    if (error) {
      playError();
      notify(error.message, false);
      setDeletingId(null);
      return;
    }

    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    notify("Payment removed from the ledger.");
    setDeletingId(null);
  }

  async function handleAddPayment() {
    if (!userId) return;
    const amt = clampMoney(amount);
    if (!merchant.trim() || amt <= 0) {
      playError();
      notify("Enter a payment name and amount.", false);
      return;
    }
    if (payType === "debt" && !debtId) {
      playError();
      notify("Select a debt.", false);
      return;
    }
    if (payType === "bill" && !billId) {
      playError();
      notify("Select a bill.", false);
      return;
    }

    setSaving(true);
    let triggeredDebt: { name: string; balance: number } | null = null;
    if (payType === "debt" && debtId) {
      const target = debts.find((d) => d.id === debtId);
      if (target) {
        const remaining = clampMoney(target.balance) - amt;
        if (remaining <= 0) {
          triggeredDebt = { name: target.name, balance: clampMoney(target.balance) };
        }
      }
    }

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      date_iso: dateISO,
      merchant: merchant.trim(),
      amount: amt,
      note: note.trim() || null,
      debt_id: payType === "debt" ? debtId : null,
      bill_id: payType === "bill" ? billId : null,
    });

    if (error) {
      playError();
      notify(error.message, false);
      setSaving(false);
      return;
    }

    const xpResult = await awardXpForPayment(supabase, userId, {
      isDebt: payType === "debt",
    });

    setMerchant("");
    setAmount("");
    setNote("");
    setDebtId("");
    setBillId("");
    setDateISO(todayISO());
    await reload(userId);

    if (triggeredDebt) {
      setCeremony({ debtName: triggeredDebt.name, amountPaid: amt });
      if (xpResult.error) {
        // still show XP issue after ceremony closes via toast
        notify(`Debt cleared · XP issue: ${xpResult.error}`, false);
      }
    } else {
      playCashRegister();
      if (xpResult.error) {
        playError();
        notify(`Payment saved, but XP failed: ${xpResult.error}`, false);
      } else if (xpResult.leveledUp) {
        playLevelUp();
        const title = getLevelReward(xpResult.level).title;
        notify(
          `Payment recorded · +${xpResult.amount} XP · Level ${xpResult.level} — ${title}!`
        );
      } else {
        playXpGain();
        notify(
          `Payment recorded · +${xpResult.amount} XP (Level ${xpResult.level}).`
        );
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-black text-[#f5e6c8]">
        <p>Ben is opening the payment ledger…</p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen pb-24 px-4 pt-6"
      style={{
        background: "linear-gradient(180deg,#050302,#140a04 45%,#050302)",
        color: "#f5e6c8",
        fontFamily: "EB Garamond, serif",
      }}
    >
      {ceremony && (
        <DebtZeroCeremony
          debtName={ceremony.debtName}
          amountPaid={ceremony.amountPaid}
          onClose={() => {
            setCeremony(null);
            notify("Debt cleared from the ledger. Well done!");
          }}
        />
      )}

      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/world")}
          className="mb-4 rounded-full px-4 py-2 text-sm"
          style={{
            border: "1px solid rgba(201,168,76,0.45)",
            background: "rgba(0,0,0,0.6)",
          }}
        >
          ← Back to Town
        </button>
        <h1 className="font-cinzel text-4xl font-bold mb-2">Payment Hall</h1>
        <p className="mb-6 text-[#d6c09a]">
          Record payments, earn XP, and remove mistakes from the ledger.
        </p>

        {message && (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-sm"
            style={{
              border: msgOk
                ? "1px solid rgba(74,222,128,0.4)"
                : "1px solid rgba(248,113,113,0.5)",
              background: "rgba(15,8,4,0.92)",
              color: msgOk ? "#4ade80" : "#fca5a5",
            }}
          >
            {message}
          </div>
        )}

        <section
          className="rounded-3xl p-6 mb-6"
          style={{
            border: "1px solid rgba(201,168,76,0.32)",
            background: "rgba(18,10,4,0.95)",
          }}
        >
          <h2 className="font-cinzel text-xl font-bold mb-4">Record Payment</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(["debt", "bill"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setPayType(t);
                  setDebtId("");
                  setBillId("");
                }}
                className="rounded-2xl py-3 text-sm font-bold"
                style={{
                  border: `1px solid ${
                    payType === t
                      ? "rgba(201,168,76,0.7)"
                      : "rgba(201,168,76,0.2)"
                  }`,
                  background:
                    payType === t ? "rgba(201,168,76,0.18)" : "transparent",
                }}
              >
                {t === "debt" ? "💳 Debt" : "📬 Bill"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className="block text-xs uppercase tracking-widest"
              style={{ color: "#c9a84c" }}
            >
              Date
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2 text-[#24130a]"
              />
            </label>
            <label
              className="block text-xs uppercase tracking-widest"
              style={{ color: "#c9a84c" }}
            >
              Name
              <input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Car payment, rent…"
                className="mt-1 w-full rounded-xl px-3 py-2 text-[#24130a]"
              />
            </label>
            <label
              className="block text-xs uppercase tracking-widest"
              style={{ color: "#c9a84c" }}
            >
              Amount
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-xl px-3 py-2 text-[#24130a]"
              />
            </label>
            <label
              className="block text-xs uppercase tracking-widest"
              style={{ color: "#c9a84c" }}
            >
              {payType === "debt" ? "Debt" : "Bill"}
              <select
                value={payType === "debt" ? debtId : billId}
                onChange={(e) =>
                  payType === "debt"
                    ? setDebtId(e.target.value)
                    : setBillId(e.target.value)
                }
                className="mt-1 w-full rounded-xl px-3 py-2 text-[#24130a]"
              >
                <option value="">Choose…</option>
                {payType === "debt"
                  ? debts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))
                  : bills.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
              </select>
            </label>
          </div>
          <label
            className="mt-3 block text-xs uppercase tracking-widest"
            style={{ color: "#c9a84c" }}
          >
            Note
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-xl px-3 py-2 text-[#24130a]"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleAddPayment()}
            className="mt-5 w-full rounded-2xl py-4 font-cinzel font-bold uppercase tracking-wider disabled:opacity-60"
            style={{
              background: "linear-gradient(180deg,#16a34a,#15803d)",
              color: "#f0fdf4",
            }}
          >
            {saving ? "Recording…" : "🪙 Record Payment"}
          </button>
        </section>

        <section
          className="rounded-3xl p-6"
          style={{
            border: "1px solid rgba(201,168,76,0.28)",
            background: "rgba(18,10,4,0.95)",
          }}
        >
          <h2 className="font-cinzel text-xl font-bold mb-4">Recent Payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-[#a08050]">No payments yet.</p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{p.merchant || "Payment"}</p>
                    <p className="text-xs text-[#b99b60]">
                      {p.date_iso} ·{" "}
                      {p.debt_id ? "Debt" : p.bill_id ? "Bill" : "Ledger"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-bold text-green-400">
                      {money(p.amount)}
                    </span>
                    <button
                      type="button"
                      disabled={deletingId === p.id}
                      onClick={() => void handleDeletePayment(p.id)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"
                      style={{
                        border: "1px solid rgba(248,113,113,0.45)",
                        color: "#fca5a5",
                        background: "rgba(127,29,29,0.25)",
                      }}
                    >
                      {deletingId === p.id ? "…" : "Delete"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
