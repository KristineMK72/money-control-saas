"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import DebtZeroCeremony from "@/components/DebtZeroCeremony";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ocrImageFile, parseTransactionsScreenshot } from "@/lib/money/receiptOcr";
import { clampMoney, money } from "@/lib/money/math";
import { todayISO } from "@/lib/money/utils";
import { currentMonthStartISO } from "@/lib/money/dates";
import { playError, playCashRegister } from "@/lib/sounds";

const PAYMENTS_BG = "/058223E5-4FAA-4CF8-851C-05CBEE73C881.png";

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentRow = {
  id: string;
  user_id: string;
  date_iso: string;
  merchant: string | null;
  amount: number | string | null;
  note: string | null;
  created_at: string;
  debt_id: string | null;
  bill_id: string | null;
};

type DebtRow  = { id: string; name: string; balance: number | string | null };
type BillRow  = { id: string; name: string; target: number | string | null; monthly_target: number | string | null };

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const router  = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId,  setUserId]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err" | "info">("ok");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [debts,    setDebts]    = useState<DebtRow[]>([]);
  const [bills,    setBills]    = useState<BillRow[]>([]);

  const [dateISO,   setDateISO]   = useState(todayISO());
  const [merchant,  setMerchant]  = useState("");
  const [amount,    setAmount]    = useState("");
  const [note,      setNote]      = useState("");
  const [payType,   setPayType]   = useState<"debt" | "bill">("debt");
  const [debtId,    setDebtId]    = useState("");
  const [billId,    setBillId]    = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning,  setScanning]  = useState(false);
  const [showBen,   setShowBen]   = useState(false);
  const [ceremony,  setCeremony]  = useState<{ debtName: string; amountPaid: number } | null>(null);

  // ── Scan drawer ──────────────────────────────────────────────────────────
  const [scanOpen, setScanOpen] = useState(false);
  const scanBtnRef = useRef<HTMLButtonElement>(null);

  function notify(msg: string, type: "ok" | "err" | "info" = "ok") {
    setMessage(msg);
    setMsgType(type);
    window.setTimeout(() => setMessage(""), 4500);
  }

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) { notify(error.message, "err"); return; }
    setPayments(data || []);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase
      .from("debts")
      .select("id, name, balance")
      .eq("user_id", uid)
      .order("name");
    if (error) { notify(error.message, "err"); return; }
    setDebts(data || []);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("id, name, target, monthly_target")
      .eq("user_id", uid)
      .order("name");
    if (error) { notify(error.message, "err"); return; }
    setBills(data || []);
  }

  async function reloadAll(uid: string) {
    await Promise.all([loadPayments(uid), loadDebts(uid), loadBills(uid)]);
  }

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (error) { notify(error.message, "err"); setLoading(false); return; }
      const user = data.session?.user;
      if (!user) { notify("Sign in to record payments.", "info"); setLoading(false); return; }
      setUserId(user.id);
      await reloadAll(user.id);
      setLoading(false);
    }
    void init();
  }, [supabase]);

  async function handleScanPayment() {
    if (!imageFile) return;
    setScanning(true);
    notify("Ben is reading the payment proof.", "info");
    try {
      const { text } = await ocrImageFile(imageFile);
      const first = parseTransactionsScreenshot(text)[0];
      if (!first) { notify("No clear payment found. Fill it in manually.", "info"); setScanning(false); return; }
      setMerchant(first.merchant || "");
      if (first.amount) setAmount(String(first.amount));
      if (first.dateText && /^\d{4}-\d{2}-\d{2}$/.test(first.dateText)) setDateISO(first.dateText);
      setNote("Scanned payment proof");
      notify("Scanner filled what it could. Review before saving.", "info");
    } catch {
      notify("Scanner had trouble. Manual entry still works.", "err");
    }
    setScanning(false);
  }

  async function handleAddPayment() {
    if (!userId) return;
    const amt = clampMoney(amount);
    if (!merchant.trim() || amt <= 0) { playError(); notify("Enter a payment name and amount.", "err"); return; }
    if (payType === "debt" && !debtId) { playError(); notify("Select a debt.", "err"); return; }
    if (payType === "bill" && !billId) { playError(); notify("Select a bill.", "err"); return; }

    setSaving(true);
    let triggeredDebt: { name: string; balance: number } | null = null;

    if (payType === "debt" && debtId) {
      const target = debts.find((d) => d.id === debtId);
      if (target) {
        const remaining = clampMoney(target.balance) - amt;
        if (remaining <= 0) triggeredDebt = { name: target.name, balance: clampMoney(target.balance) };
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

    if (error) { playError(); notify(error.message, "err"); setSaving(false); return; }

    setMerchant(""); setAmount(""); setNote(""); setDebtId(""); setBillId("");
    setPayType("debt"); setDateISO(todayISO()); setImageFile(null);

    await reloadAll(userId);

    if (triggeredDebt) {
      setCeremony({ debtName: triggeredDebt.name, amountPaid: amt });
    } else {
      playCashRegister();
      notify("Payment recorded. Ben stamped the ledger.", "ok");
    }
    setSaving(false);
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const currentMonthStart  = currentMonthStartISO();
  const monthlyPayments    = useMemo(() => payments.filter((p) => (p.date_iso || p.created_at || "").slice(0, 10) >= currentMonthStart), [payments, currentMonthStart]);
  const monthlyTotal       = useMemo(() => monthlyPayments.reduce((s, p) => s + clampMoney(p.amount), 0), [monthlyPayments]);
  const allTimeTotal       = useMemo(() => payments.reduce((s, p) => s + clampMoney(p.amount), 0), [payments]);
  const latestPayment      = payments[0];
  const debtPayments       = payments.filter((p) => p.debt_id).length;
  const billPayments       = payments.filter((p) => p.bill_id).length;
  const monthlyDebtPay     = monthlyPayments.filter((p) => p.debt_id).length;
  const monthlyBillPay     = monthlyPayments.filter((p) => p.bill_id).length;

  const benInsight = BenEngine.getForecastMessage({
    name: null, timeframeLabel: "Payments",
    totalNeeded: allTimeTotal, incomeSoFar: allTimeTotal,
    incomeGap: 0, dailyIncomeNeeded: 0,
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-black text-[#f5e6c8]" style={{ fontFamily: "EB Garamond, serif" }}>
        <div className="rounded-3xl px-8 py-6" style={{ border: "1px solid rgba(201,168,76,0.4)", background: "rgba(0,0,0,0.85)" }}>
          Ben is opening the payment ledger…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg,#050302,#140a04 45%,#050302)", color: "#f5e6c8", fontFamily: "EB Garamond, serif" }}>
      {/* ── Debt-zero ceremony overlay ──────────────────────────────────── */}
      {ceremony && (
        <DebtZeroCeremony
          debtName={ceremony.debtName}
          amountPaid={ceremony.amountPaid}
          onClose={() => { setCeremony(null); notify("Debt cleared from the ledger. Well done!", "ok"); }}
        />
      )}

      {/* ── Ben's Notice modal ──────────────────────────────────────────── */}
      {showBen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.82)" }}
          onClick={() => setShowBen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6"
            style={{ background: "linear-gradient(180deg,#130a04,#080402)", border: "1px solid rgba(201,168,76,0.45)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-cinzel mb-4 text-xs uppercase tracking-widest" style={{ color: "#c9a84c" }}>
              Ben's Notice
            </p>
            <BenBubble message={benInsight.text} mood={benInsight.mood} />
            <button
              type="button"
              onClick={() => setShowBen(false)}
              className="mt-5 w-full rounded-2xl py-3 font-cinzel text-sm font-bold uppercase tracking-widest transition-all active:scale-95"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pt-6">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative mb-8 overflow-hidden rounded-3xl" style={{ border: "1px solid rgba(201,168,76,0.35)", background: "#050302" }}>
          <img
            src={PAYMENTS_BG}
            alt="Payment Hall"
            className="block h-auto w-full object-cover"
            style={{ maxHeight: 520 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* gradient shade */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.18) 0%,rgba(5,3,2,0.88) 100%)" }} />

          {/* Back to Town + Ben's Notice */}
          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/world")}
              className="rounded-full px-4 py-2 text-sm transition-all active:scale-95"
              style={{ background: "rgba(0,0,0,0.68)", border: "1px solid rgba(201,168,76,0.45)", color: "#f5e6c8", fontFamily: "EB Garamond, serif" }}
            >
              ← Back to Town
            </button>
            <button
              type="button"
              onClick={() => setShowBen(true)}
              className="rounded-full px-4 py-2 text-sm transition-all active:scale-95"
              style={{ background: "rgba(201,168,76,0.14)", border: "1px solid rgba(201,168,76,0.5)", color: "#c9a84c", fontFamily: "EB Garamond, serif" }}
            >
              🪙 Ben's Notice
            </button>
          </div>

          {/* Title block */}
          <div className="absolute bottom-6 left-6 right-6 z-10">
            <p className="font-cinzel mb-1 text-xs uppercase tracking-[0.3em]" style={{ color: "#c9a84c" }}>
              Franklin's Landing
            </p>
            <h1
              className="font-cinzel font-bold leading-none"
              style={{ fontSize: "clamp(36px,8vw,78px)", color: "#f5e6c8", textShadow: "0 2px 24px rgba(0,0,0,0.9)" }}
            >
              Payment Hall
            </h1>
            <p className="mt-2 text-base" style={{ color: "#d6c09a" }}>
              Record payments, scan proof, and let Ben stamp each victory into the colony ledger.
            </p>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon="🪙" label="Paid This Month"  value={money(monthlyTotal)}      helper={`${monthlyPayments.length} payments`} />
          <Metric icon="📜" label="All-Time Paid"    value={money(allTimeTotal)}       helper={`${payments.length} entries`} />
          <Metric icon="💳" label="Debt Payments"    value={String(debtPayments)}      helper={`${monthlyDebtPay} this month`} />
          <Metric icon="📬" label="Bill Payments"    value={String(billPayments)}      helper={`${monthlyBillPay} this month`} />
        </div>

        {/* ── Toast ─────────────────────────────────────────────────────── */}
        {message && (
          <div
            className="mb-5 rounded-2xl px-5 py-4 text-sm"
            style={{
              background: "rgba(15,8,4,0.92)",
              border: `1px solid ${msgType === "err" ? "rgba(248,113,113,0.5)" : msgType === "info" ? "rgba(147,197,253,0.4)" : "rgba(74,222,128,0.4)"}`,
              color: msgType === "err" ? "#fca5a5" : msgType === "info" ? "#93c5fd" : "#4ade80",
            }}
          >
            {message}
          </div>
        )}

        {/* ── Record Payment card ───────────────────────────────────────── */}
        <Card title="Record Payment" sub="Enter a new victory for the treasury.">
          {/* Payment type — prominent top picker */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            {(["debt", "bill"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setPayType(t); setDebtId(""); setBillId(""); }}
                className="rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
                style={{
                  background: payType === t ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${payType === t ? "rgba(201,168,76,0.7)" : "rgba(201,168,76,0.2)"}`,
                  color: payType === t ? "#f5e6c8" : "#a08050",
                  fontFamily: "EB Garamond, serif",
                }}
              >
                {t === "debt" ? "💳 Debt Payment" : "📬 Bill Payment"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={dateISO}
              onChange={(v) => setDateISO(v)}
            />
            <Input
              label="Payment Name"
              value={merchant}
              onChange={(v) => setMerchant(v)}
              placeholder="Car payment, Credit One, rent…"
            />
            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={(v) => setAmount(v)}
              placeholder="0.00"
            />

            <SelectInput
              label={payType === "debt" ? "Select Debt" : "Select Bill"}
              value={payType === "debt" ? debtId : billId}
              onChange={(v) => payType === "debt" ? setDebtId(v) : setBillId(v)}
            >
              <option value="">Choose {payType === "debt" ? "a debt" : "a bill"}…</option>
              {payType === "debt"
                ? debts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.balance != null ? ` — ${money(d.balance)} balance` : ""}
                    </option>
                  ))
                : bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {money(b.monthly_target ?? b.target ?? 0)}
                    </option>
                  ))}
            </SelectInput>
          </div>

          <div className="mt-4">
            <Input
              label="Note"
              value={note}
              onChange={(v) => setNote(v)}
              placeholder="Optional note…"
              multiline
            />
          </div>

          <button
            type="button"
            onClick={() => void handleAddPayment()}
            disabled={saving}
            className="mt-5 w-full rounded-2xl py-4 font-cinzel text-base font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#f0fdf4", border: "1px solid rgba(74,222,128,0.5)", boxShadow: "0 0 20px rgba(74,222,128,0.2)" }}
          >
            {saving ? "Recording…" : "🪙 Record Payment"}
          </button>
        </Card>

        {/* ── Scan drawer ───────────────────────────────────────────────── */}
        <div className="mt-4">
          <button
            ref={scanBtnRef}
            type="button"
            onClick={() => setScanOpen((o) => !o)}
            className="w-full rounded-2xl py-4 font-cinzel text-sm font-bold uppercase tracking-wider transition-all active:scale-95"
            style={{
              background: scanOpen ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(201,168,76,0.35)",
              color: "#c9a84c",
            }}
          >
            {scanOpen ? "▲ Close Scanner" : "📷 Scan Payment Proof"}
          </button>

          {scanOpen && (
            <div className="mt-3 rounded-3xl p-5" style={{ background: "linear-gradient(180deg,rgba(18,10,4,0.96),rgba(5,3,2,0.98))", border: "1px solid rgba(201,168,76,0.3)" }}>
              <p className="font-cinzel mb-4 text-xs uppercase tracking-widest" style={{ color: "#c9a84c" }}>Scan Payment Proof</p>
              <p className="mb-5 text-sm" style={{ color: "#b99b60" }}>Upload receipt, screenshot, or confirmation. Ben will fill what he can.</p>
              <PaperScrollScanner
                title="Scan Payment Proof"
                description="Upload payment proof. Ben will fill what he can, and you approve the ledger."
                file={imageFile}
                busy={scanning}
                onFileChange={setImageFile}
                onScan={() => void handleScanPayment()}
              />
            </div>
          )}
        </div>

        {/* ── Recent Payments ledger ────────────────────────────────────── */}
        <div className="mt-4">
          <Card
            title="Recent Payments"
            sub={latestPayment
              ? `${latestPayment.merchant || "Latest"} — ${money(latestPayment.amount)}`
              : "The ledger awaits its first payment."}
          >
            {payments.length === 0 ? (
              <div className="rounded-2xl px-5 py-8 text-center text-sm" style={{ border: "1px solid rgba(201,168,76,0.15)", color: "#a08050" }}>
                No payments yet. The payment ledger is ready.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-3 rounded-2xl px-4 py-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.14)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold" style={{ color: "#f5e6c8" }}>{p.merchant || "Payment"}</span>
                        <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(201,168,76,0.12)", color: "#facc15" }}>
                          {p.debt_id ? "💳 Debt" : p.bill_id ? "📬 Bill" : "📜 Ledger"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "#b99b60" }}>
                        {p.date_iso}
                        {p.note ? ` • ${p.note}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xl font-bold tabular-nums" style={{ color: "#4ade80" }}>
                      {money(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Metric({ icon, label, value, helper }: { icon: string; label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: "linear-gradient(180deg,rgba(18,10,4,0.94),rgba(5,3,2,0.97))", border: "1px solid rgba(201,168,76,0.28)" }}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-cinzel text-xs uppercase tracking-widest mb-1" style={{ color: "#c9a84c" }}>{label}</div>
      <div className="text-3xl font-bold" style={{ color: "#4ade80", fontFamily: "EB Garamond, serif" }}>{value}</div>
      {helper && <div className="mt-1 text-xs" style={{ color: "#d6c09a" }}>{helper}</div>}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl p-6" style={{ background: "linear-gradient(180deg,rgba(18,10,4,0.94),rgba(5,3,2,0.98))", border: "1px solid rgba(201,168,76,0.32)" }}>
      <h2 className="font-cinzel text-xl font-bold" style={{ color: "#f5e6c8" }}>{title}</h2>
      {sub && <p className="mt-1 mb-4 text-sm" style={{ color: "#b99b60" }}>{sub}</p>}
      {children}
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, type = "text", multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    width: "100%", background: "rgba(245,230,200,0.96)", color: "#24130a",
    border: "1px solid rgba(201,168,76,0.55)", borderRadius: 14,
    padding: "12px 14px", fontSize: 15, fontFamily: "EB Garamond, serif",
  };
  return (
    <div>
      <label className="font-cinzel mb-2 block text-xs uppercase tracking-widest" style={{ color: "#c9a84c" }}>{label}</label>
      {multiline
        ? <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={sharedStyle} />
        : <input type={type} step={type === "number" ? "0.01" : undefined} inputMode={type === "number" ? "decimal" : undefined} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={sharedStyle} />
      }
    </div>
  );
}

function SelectInput({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="font-cinzel mb-2 block text-xs uppercase tracking-widest" style={{ color: "#c9a84c" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "rgba(245,230,200,0.96)", color: "#24130a", border: "1px solid rgba(201,168,76,0.55)", borderRadius: 14, padding: "12px 14px", fontSize: 15, fontFamily: "EB Garamond, serif" }}
      >
        {children}
      </select>
    </div>
  );
}
