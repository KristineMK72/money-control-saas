"use client";

import { useEffect, useMemo, useState } from "react";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import DebtZeroCeremony from "@/components/DebtZeroCeremony";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ocrImageFile, parseTransactionsScreenshot } from "@/lib/money/receiptOcr";
import { clampMoney, money } from "@/lib/money/math";
import { todayISO } from "@/lib/money/utils";
import { currentMonthStartISO } from "@/lib/money/dates";
import { playCoins, playError, playCashRegister } from "@/lib/sounds";

type PaymentRow = {
  id: string; user_id: string; date_iso: string;
  merchant: string | null; amount: number | string | null;
  note: string | null; created_at: string;
  debt_id: string | null; bill_id: string | null;
};

type DebtRow = { id: string; name: string; balance: number | string | null; };
type BillRow = { id: string; name: string; target: number | string | null; monthly_target: number | string | null; };

/* ─── UI primitives ─────────────────────────────────────────────── */

const CARD: React.CSSProperties = {
  background: "rgba(15,8,4,0.88)", border: "1px solid rgba(107,68,35,0.5)",
  backdropFilter: "blur(4px)", borderRadius: "0.75rem", padding: "1.25rem",
};

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={CARD}>
      <div className="mb-4 pb-3" style={{ borderBottom: "1px solid rgba(107,68,35,0.3)" }}>
        <h2 className="font-cinzel text-lg font-bold" style={{ color: "#c9a84c" }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5 italic" style={{ color: "#9a7d5a" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function MetricTile({ label, value, helper, green = false }: {
  label: string; value: string; helper?: string; green?: boolean;
}) {
  return (
    <div className="rounded-xl p-4"
         style={{ background: "rgba(107,68,35,0.15)", border: "1px solid rgba(107,68,35,0.3)" }}>
      <p className="text-[10px] uppercase tracking-widest font-cinzel mb-1" style={{ color: "#9a7d5a" }}>{label}</p>
      <p className="text-xl font-bold font-cinzel" style={{ color: green ? "#4ade80" : "#c9a84c" }}>{value}</p>
      {helper && <p className="text-[11px] mt-1 italic" style={{ color: "#6b4423" }}>{helper}</p>}
    </div>
  );
}

const INPUT: React.CSSProperties = {
  width: "100%", background: "#f5e6c8", color: "#2d1810",
  border: "1px solid rgba(201,168,76,0.5)", borderRadius: "0.5rem",
  padding: "0.625rem 0.875rem", fontFamily: "EB Garamond, serif",
  fontSize: "15px", outline: "none",
};

function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-widest font-cinzel font-semibold mb-1"
       style={{ color: "#9a7d5a" }}>{children}</p>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function PaymentsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId,   setUserId]   = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState("");
  const [msgType,  setMsgType]  = useState<"ok" | "err" | "info">("ok");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [debts,    setDebts]    = useState<DebtRow[]>([]);
  const [bills,    setBills]    = useState<BillRow[]>([]);

  const [dateISO,  setDateISO]  = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount,   setAmount]   = useState("");
  const [note,     setNote]     = useState("");
  const [payType,  setPayType]  = useState<"debt" | "bill">("debt");
  const [debtId,   setDebtId]   = useState("");
  const [billId,   setBillId]   = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning,  setScanning]  = useState(false);

  /* ── Debt Zero Ceremony state ── */
  const [ceremony, setCeremony] = useState<{ debtName: string; amountPaid: number } | null>(null);

  /* ── Data loading ── */
  async function loadPayments(uid: string) {
    const { data, error } = await supabase.from("payments").select("*")
      .eq("user_id", uid).order("date_iso", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) { notify(error.message, "err"); return; }
    setPayments(data || []);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase.from("debts")
      .select("id, name, balance").eq("user_id", uid).order("name");
    if (error) { notify(error.message, "err"); return; }
    setDebts(data || []);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase.from("bills")
      .select("id, name, target, monthly_target").eq("user_id", uid).order("name");
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
      if (!user) { notify("Sign in so Ben can witness the payments.", "info"); setLoading(false); return; }
      setUserId(user.id);
      await reloadAll(user.id);
      setLoading(false);
    }
    void init();
  }, [supabase]);

  function notify(msg: string, type: "ok" | "err" | "info" = "ok") {
    setMessage(msg); setMsgType(type);
  }

  /* ── OCR scan ── */
  async function handleScanPayment() {
    if (!imageFile) return;
    setScanning(true); notify("Ben is reading the payment proof.", "info");
    try {
      const { text } = await ocrImageFile(imageFile);
      const first    = parseTransactionsScreenshot(text)[0];
      if (!first) { notify("No clear payment found. Fill it in manually.", "info"); setScanning(false); return; }
      setMerchant(first.merchant || "");
      if (first.amount) setAmount(String(first.amount));
      if (first.dateText && /^\d{4}-\d{2}-\d{2}$/.test(first.dateText)) setDateISO(first.dateText);
      setNote("Scanned payment proof");
      notify("Scanner filled what it could. Review before saving.", "info");
    } catch {
      notify("Scanner had trouble with that proof. Manual entry still works.", "err");
    }
    setScanning(false);
  }

  /* ── Add payment — checks for debt zero ── */
  async function handleAddPayment() {
    setMessage("");
    if (!userId) return;
    const amt = clampMoney(amount);
    if (!merchant.trim() || amt <= 0) { playError(); notify("Enter a payment name and amount.", "err"); return; }
    if (payType === "debt" && !debtId) { playError(); notify("Select a debt.", "err"); return; }
    if (payType === "bill" && !billId) { playError(); notify("Select a bill.", "err"); return; }

    setSaving(true);

    /* Check if this payment zeros the debt — BEFORE inserting */
    let triggeredDebt: { name: string; balance: number } | null = null;
    if (payType === "debt" && debtId) {
      const target = debts.find(d => d.id === debtId);
      if (target) {
        const remaining = clampMoney(target.balance) - amt;
        if (remaining <= 0) {
          triggeredDebt = { name: target.name, balance: clampMoney(target.balance) };
        }
      }
    }

    const { error } = await supabase.from("payments").insert({
      user_id: userId, date_iso: dateISO, merchant: merchant.trim(),
      amount: amt, note: note.trim() || null,
      debt_id: payType === "debt" ? debtId : null,
      bill_id: payType === "bill" ? billId : null,
    });

    if (error) { playError(); notify(error.message, "err"); setSaving(false); return; }

    setMerchant(""); setAmount(""); setNote(""); setDebtId(""); setBillId("");
    setPayType("debt"); setDateISO(todayISO()); setImageFile(null);
    await reloadAll(userId);

    if (triggeredDebt) {
      /* Ceremony takes priority over normal notice */
      setCeremony({ debtName: triggeredDebt.name, amountPaid: amt });
    } else {
      playCashRegister();
      notify("Payment recorded. A fine entry for the ledger.", "ok");
    }
    setSaving(false);
  }

  /* ── Derived ── */
  const currentMonthStart  = currentMonthStartISO();
  const monthlyPayments    = useMemo(() =>
    payments.filter(p => (p.date_iso || p.created_at || "").slice(0, 10) >= currentMonthStart),
    [payments, currentMonthStart]);
  const monthlyTotal       = useMemo(() => monthlyPayments.reduce((s, p) => s + clampMoney(p.amount), 0), [monthlyPayments]);
  const allTimeTotal       = useMemo(() => payments.reduce((s, p) => s + clampMoney(p.amount), 0), [payments]);
  const latestMonthly      = monthlyPayments[0];
  const debtPayments       = payments.filter(p => p.debt_id).length;
  const billPayments       = payments.filter(p => p.bill_id).length;
  const monthlyDebtPay     = monthlyPayments.filter(p => p.debt_id).length;
  const monthlyBillPay     = monthlyPayments.filter(p => p.bill_id).length;

  const benInsight = BenEngine.getForecastMessage({
    name: null, timeframeLabel: "Payments",
    totalNeeded: allTimeTotal, incomeSoFar: allTimeTotal, incomeGap: 0, dailyIncomeNeeded: 0,
  });

  const msgColor = { ok: "#c9a84c", err: "#f87171", info: "#93c5fd" }[msgType];
  const msgBg    = { ok: "rgba(201,168,76,0.08)", err: "rgba(248,113,113,0.08)", info: "rgba(147,197,253,0.08)" }[msgType];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ben-merchant bg-cover bg-center">
        <div style={{ ...CARD, padding: "2rem 3rem", textAlign: "center" }}>
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>
            Ben is consulting the payment ledger&hellip;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ben-merchant bg-cover bg-center bg-fixed"
         style={{ fontFamily: "EB Garamond, serif" }}>

      {/* ── Debt Zero Ceremony overlay ── */}
      {ceremony && (
        <DebtZeroCeremony
          debtName={ceremony.debtName}
          amountPaid={ceremony.amountPaid}
          onClose={() => { setCeremony(null); notify("Debt struck from the ledger. Well done, Governor.", "ok"); }}
        />
      )}

      <div className="min-h-screen pb-28" style={{ background: "rgba(10,5,2,0.72)" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="pt-4 pb-2">
            <p className="text-xs uppercase tracking-[0.2em] font-cinzel font-semibold"
               style={{ color: "#6b4423" }}>AskBen Payments</p>
            <h1 className="font-cinzel text-4xl font-bold mt-1" style={{ color: "#c9a84c" }}>
              Payment Ledger
            </h1>
            <p className="mt-1 text-sm italic" style={{ color: "#9a7d5a" }}>
              Record proof that thou handled business. Ben respects evidence.
            </p>
          </div>

          {/* ── Notice ── */}
          {message && (
            <div className="rounded-xl px-4 py-3 text-sm"
                 style={{ background: msgBg, border: `1px solid ${msgColor}40`, color: msgColor }}>
              {msgType === "ok" ? "✦" : msgType === "err" ? "⚠" : "◈"} {message}
            </div>
          )}

          {/* ── Victory Briefing ── */}
          <Section title="Payment Victory Briefing" subtitle="Monthly progress and lifetime totals">
            <BenBubble message={benInsight.text} mood={benInsight.mood} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricTile label="Paid This Month"     value={money(monthlyTotal)}
                          helper={latestMonthly ? `${latestMonthly.merchant || "Latest"} — ${money(latestMonthly.amount)}` : "No payments this month yet"}
                          green />
              <MetricTile label="Payments This Month" value={String(monthlyPayments.length)}
                          helper={`${monthlyDebtPay} debt • ${monthlyBillPay} bill`} />
              <MetricTile label="All-Time Total"      value={money(allTimeTotal)}
                          helper="Cumulative payment total" green />
              <MetricTile label="All-Time Count"      value={String(payments.length)}
                          helper={`${debtPayments} debt • ${billPayments} bill`} />
            </div>
          </Section>

          {/* ── Scan Payment Proof ── */}
          <Section title="Scan Payment Proof"
                   subtitle={scanning ? "Ben is reading the proof…" : "Upload receipt, screenshot, or confirmation"}>
            <PaperScrollScanner
              title="Scan Payment Proof"
              description="Upload a receipt, bank screenshot, or confirmation. Ben will fill the draft and await thy approval."
              file={imageFile} busy={scanning}
              onFileChange={setImageFile}
              onScan={() => void handleScanPayment()}
            />
          </Section>

          {/* ── Add Payment form ── */}
          <Section title="Add Payment"
                   subtitle={merchant || amount ? "Draft ready — review and record" : "Record a victory"}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <GoldLabel>Date</GoldLabel>
                <input type="date" value={dateISO} onChange={e => setDateISO(e.target.value)} style={INPUT} />
              </div>

              <div>
                <GoldLabel>Payment Name</GoldLabel>
                <input placeholder="What did thou pay?" value={merchant}
                       onChange={e => setMerchant(e.target.value)} style={INPUT} />
              </div>

              <div>
                <GoldLabel>Amount</GoldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                        style={{ color: "#2d1810" }}>$</span>
                  <input type="number" step="0.01" inputMode="decimal" placeholder="0.00"
                         value={amount} onChange={e => setAmount(e.target.value)}
                         style={{ ...INPUT, paddingLeft: "1.75rem" }} />
                </div>
              </div>

              <div>
                <GoldLabel>Payment Type</GoldLabel>
                <select value={payType}
                        onChange={e => { setPayType(e.target.value as "debt" | "bill"); setDebtId(""); setBillId(""); }}
                        style={INPUT}>
                  <option value="debt">💳 Debt Payment</option>
                  <option value="bill">📋 Bill Payment</option>
                </select>
              </div>

              {payType === "debt" ? (
                <div className="md:col-span-2">
                  <GoldLabel>Select Debt</GoldLabel>
                  <select value={debtId} onChange={e => setDebtId(e.target.value)} style={INPUT}>
                    <option value="">Choose a debt…</option>
                    {debts.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.balance != null ? ` — ${money(d.balance)} balance` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <GoldLabel>Select Bill</GoldLabel>
                  <select value={billId} onChange={e => setBillId(e.target.value)} style={INPUT}>
                    <option value="">Choose a bill…</option>
                    {bills.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {money(b.monthly_target ?? b.target ?? 0)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <GoldLabel>Note (optional)</GoldLabel>
                <textarea placeholder="Add a note for the ledger…"
                          value={note} onChange={e => setNote(e.target.value)}
                          rows={3} style={{ ...INPUT, resize: "vertical" }} />
              </div>

              <button onClick={handleAddPayment} disabled={saving}
                      className="md:col-span-2 rounded-xl py-3 font-cinzel text-sm font-bold uppercase tracking-widest transition disabled:opacity-50"
                      style={{ background: "#2d5a27", color: "#f5e6c8", border: "1px solid #4a8a42" }}>
                {saving ? "Recording…" : "🪙 Record Payment"}
              </button>
            </div>
          </Section>

          {/* ── Payment History ── */}
          <Section title="Payment History"
                   subtitle={payments[0]
                     ? `${payments[0].merchant || "Latest"} — ${money(payments[0].amount)}`
                     : "The ledger awaits its first victory"}>
            <div className="space-y-2">
              {payments.length === 0 ? (
                <div className="rounded-xl px-4 py-6 text-center"
                     style={{ background: "rgba(107,68,35,0.1)", border: "1px solid rgba(107,68,35,0.3)" }}>
                  <p className="text-sm italic font-cinzel" style={{ color: "#9a7d5a" }}>
                    No payments yet. The ledger awaits its first victory.
                  </p>
                </div>
              ) : (
                payments.map(payment => {
                  const isDebt = !!payment.debt_id;
                  const isBill = !!payment.bill_id;
                  const typeLabel = isDebt ? "💳 Debt" : isBill ? "📋 Bill" : "📝";
                  const isThisMonth = (payment.date_iso || "").slice(0, 7) >= currentMonthStart.slice(0, 7);
                  return (
                    <div key={payment.id}
                         className="rounded-xl p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                         style={{
                           background: isThisMonth ? "rgba(74,138,66,0.08)" : "rgba(15,8,4,0.6)",
                           border: `1px solid ${isThisMonth ? "rgba(74,138,66,0.3)" : "rgba(107,68,35,0.3)"}`,
                         }}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-cinzel font-bold text-sm" style={{ color: "#e8d5b7" }}>
                            {payment.merchant || "Payment"}
                          </p>
                          <span className="text-[10px] rounded-full px-2 py-0.5"
                                style={{ background: "rgba(107,68,35,0.2)", color: "#9a7d5a",
                                         border: "1px solid rgba(107,68,35,0.3)" }}>
                            {typeLabel}
                          </span>
                          {isThisMonth && (
                            <span className="text-[10px] rounded-full px-2 py-0.5"
                                  style={{ background: "rgba(74,138,66,0.15)", color: "#4ade80",
                                           border: "1px solid rgba(74,138,66,0.3)" }}>
                              This month
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#6b4423" }}>
                          {payment.date_iso}
                          {payment.note ? ` • ${payment.note}` : ""}
                        </p>
                      </div>
                      <p className="font-cinzel text-lg font-bold shrink-0"
                         style={{ color: isThisMonth ? "#4ade80" : "#c9a84c" }}>
                        {money(payment.amount)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          {/* ── Quote ── */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3"
               style={{ background: "rgba(245,230,200,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              &ldquo;A penny saved is a penny earned.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
