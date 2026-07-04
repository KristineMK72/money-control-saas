"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import DebtZeroCeremony from "@/components/DebtZeroCeremony";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";
import { clampMoney, money } from "@/lib/money/math";
import { todayISO } from "@/lib/money/utils";
import { currentMonthStartISO } from "@/lib/money/dates";
import { playError, playCashRegister } from "@/lib/sounds";

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

type DebtRow = {
  id: string;
  name: string;
  balance: number | string | null;
};

type BillRow = {
  id: string;
  name: string;
  target: number | string | null;
  monthly_target: number | string | null;
};

const TREASURY_IMAGE = "/058223E5-4FAA-4CF8-851C-05CBEE73C881.png";

const panel: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(18,10,4,0.94), rgba(5,3,2,0.97))",
  border: "1px solid rgba(245,196,88,0.32)",
  boxShadow:
    "0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid rgba(245,196,88,0.42)",
  background: "rgba(255,245,220,0.94)",
  color: "#24130a",
  padding: "12px 14px",
  outline: "none",
  fontSize: 16,
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="pay-label">
      {children}
    </label>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: string;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="stat-card" style={panel}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {helper && <div className="stat-helper">{helper}</div>}
    </div>
  );
}

function RoomPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="room-panel" style={panel}>
      <div className="room-head">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function PaymentsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err" | "info">("ok");

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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ceremony, setCeremony] = useState<{
    debtName: string;
    amountPaid: number;
  } | null>(null);

  function notify(msg: string, type: "ok" | "err" | "info" = "ok") {
    setMessage(msg);
    setMsgType(type);
  }

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      notify(error.message, "err");
      return;
    }

    setPayments(data || []);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase
      .from("debts")
      .select("id, name, balance")
      .eq("user_id", uid)
      .order("name");

    if (error) {
      notify(error.message, "err");
      return;
    }

    setDebts(data || []);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("id, name, target, monthly_target")
      .eq("user_id", uid)
      .order("name");

    if (error) {
      notify(error.message, "err");
      return;
    }

    setBills(data || []);
  }

  async function reloadAll(uid: string) {
    await Promise.all([loadPayments(uid), loadDebts(uid), loadBills(uid)]);
  }

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        notify(error.message, "err");
        setLoading(false);
        return;
      }

      const user = data.session?.user;

      if (!user) {
        notify("Sign in so Ben can witness the payments.", "info");
        setLoading(false);
        return;
      }

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

      if (!first) {
        notify("No clear payment found. Fill it in manually.", "info");
        setScanning(false);
        return;
      }

      setMerchant(first.merchant || "");
      if (first.amount) setAmount(String(first.amount));

      if (first.dateText && /^\d{4}-\d{2}-\d{2}$/.test(first.dateText)) {
        setDateISO(first.dateText);
      }

      setNote("Scanned payment proof");
      notify("Scanner filled what it could. Review before saving.", "info");
    } catch {
      notify("Scanner had trouble with that proof. Manual entry still works.", "err");
    }

    setScanning(false);
  }

  async function handleAddPayment() {
    setMessage("");

    if (!userId) return;

    const amt = clampMoney(amount);

    if (!merchant.trim() || amt <= 0) {
      playError();
      notify("Enter a payment name and amount.", "err");
      return;
    }

    if (payType === "debt" && !debtId) {
      playError();
      notify("Select a debt.", "err");
      return;
    }

    if (payType === "bill" && !billId) {
      playError();
      notify("Select a bill.", "err");
      return;
    }

    setSaving(true);

    let triggeredDebt: { name: string; balance: number } | null = null;

    if (payType === "debt" && debtId) {
      const target = debts.find((d) => d.id === debtId);
      if (target) {
        const remaining = clampMoney(target.balance) - amt;
        if (remaining <= 0) {
          triggeredDebt = {
            name: target.name,
            balance: clampMoney(target.balance),
          };
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
      notify(error.message, "err");
      setSaving(false);
      return;
    }

    setMerchant("");
    setAmount("");
    setNote("");
    setDebtId("");
    setBillId("");
    setPayType("debt");
    setDateISO(todayISO());
    setImageFile(null);

    await reloadAll(userId);

    if (triggeredDebt) {
      setCeremony({ debtName: triggeredDebt.name, amountPaid: amt });
    } else {
      playCashRegister();
      notify("Payment recorded. Ben stamped the ledger.", "ok");
    }

    setSaving(false);
  }

  const currentMonthStart = currentMonthStartISO();

  const monthlyPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          (p.date_iso || p.created_at || "").slice(0, 10) >= currentMonthStart
      ),
    [payments, currentMonthStart]
  );

  const monthlyTotal = useMemo(
    () => monthlyPayments.reduce((sum, p) => sum + clampMoney(p.amount), 0),
    [monthlyPayments]
  );

  const allTimeTotal = useMemo(
    () => payments.reduce((sum, p) => sum + clampMoney(p.amount), 0),
    [payments]
  );

  const latestPayment = payments[0];
  const debtPayments = payments.filter((p) => p.debt_id).length;
  const billPayments = payments.filter((p) => p.bill_id).length;
  const monthlyDebtPay = monthlyPayments.filter((p) => p.debt_id).length;
  const monthlyBillPay = monthlyPayments.filter((p) => p.bill_id).length;

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Payments",
    totalNeeded: allTimeTotal,
    incomeSoFar: allTimeTotal,
    incomeGap: 0,
    dailyIncomeNeeded: 0,
  });

  const msgColor =
    msgType === "err" ? "#fb7185" : msgType === "info" ? "#93c5fd" : "#facc15";

  if (loading) {
    return (
      <main className="payments-page loading-page">
        <div className="loading-card" style={panel}>
          Ben is opening the Treasury Hall ledger...
        </div>
      </main>
    );
  }

  return (
    <main className="payments-page">
      {ceremony && (
        <DebtZeroCeremony
          debtName={ceremony.debtName}
          amountPaid={ceremony.amountPaid}
          onClose={() => {
            setCeremony(null);
            notify("Debt struck from the ledger. Well done, Governor.", "ok");
          }}
        />
      )}

      <section className="hero">
        <img src={TREASURY_IMAGE} alt="Treasury Hall" className="hero-img" />
        <div className="hero-shade" />

        <div className="hero-inner">
          <Link href="/world" className="back-btn">
            ← Back to Town
          </Link>

          <div className="hero-copy">
            <p className="eyebrow">Treasury Hall</p>
            <h1>Payment Ledger</h1>
            <p>
              Record payments, scan proof, and let Ben stamp each victory into
              the colony ledger.
            </p>
          </div>

          <div className="stats-grid">
            <StatCard
              icon="🪙"
              label="Paid This Month"
              value={money(monthlyTotal)}
              helper={`${monthlyPayments.length} payments`}
            />
            <StatCard
              icon="📜"
              label="All-Time Paid"
              value={money(allTimeTotal)}
              helper={`${payments.length} ledger entries`}
            />
            <StatCard
              icon="💳"
              label="Debt Payments"
              value={String(debtPayments)}
              helper={`${monthlyDebtPay} this month`}
            />
            <StatCard
              icon="📬"
              label="Bill Payments"
              value={String(billPayments)}
              helper={`${monthlyBillPay} this month`}
            />
          </div>
        </div>
      </section>

      <div className="content-wrap">
        {message && (
          <div
            className="notice"
            style={{
              ...panel,
              color: msgColor,
              borderColor: `${msgColor}66`,
            }}
          >
            {msgType === "err" ? "⚠" : msgType === "info" ? "◈" : "✦"}{" "}
            {message}
          </div>
        )}

        <RoomPanel
          title="Ben's Treasury Briefing"
          subtitle="A quick word from the desk before the ledger opens."
        >
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </RoomPanel>

        <div className="work-grid">
          <RoomPanel
            title="Record Payment"
            subtitle={
              merchant || amount
                ? "Draft ready — review and stamp it."
                : "Enter a new victory for the treasury."
            }
          >
            <div className="form-grid">
              <div>
                <Label>Date</Label>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <Label>Payment Name</Label>
                <input
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Car payment, Credit One, rent..."
                  style={inputStyle}
                />
              </div>

              <div>
                <Label>Amount</Label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>

              <div>
                <Label>Payment Type</Label>
                <select
                  value={payType}
                  onChange={(e) => {
                    setPayType(e.target.value as "debt" | "bill");
                    setDebtId("");
                    setBillId("");
                  }}
                  style={inputStyle}
                >
                  <option value="debt">💳 Debt Payment</option>
                  <option value="bill">📬 Bill Payment</option>
                </select>
              </div>

              <div className="full">
                <Label>
                  {payType === "debt" ? "Select Debt" : "Select Bill"}
                </Label>

                {payType === "debt" ? (
                  <select
                    value={debtId}
                    onChange={(e) => setDebtId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose a debt...</option>
                    {debts.map((debt) => (
                      <option key={debt.id} value={debt.id}>
                        {debt.name}
                        {debt.balance != null
                          ? ` — ${money(debt.balance)} balance`
                          : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={billId}
                    onChange={(e) => setBillId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose a bill...</option>
                    {bills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.name} —{" "}
                        {money(bill.monthly_target ?? bill.target ?? 0)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="full">
                <Label>Note</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Optional note for the ledger..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <button
                onClick={handleAddPayment}
                disabled={saving}
                className="record-btn"
              >
                {saving ? "Recording..." : "🪙 Record Payment"}
              </button>
            </div>
          </RoomPanel>

          <RoomPanel
            title="Scan Payment Proof"
            subtitle={
              scanning
                ? "Ben is reading the proof..."
                : "Upload receipt, screenshot, or confirmation."
            }
          >
            <PaperScrollScanner
              title="Scan Payment Proof"
              description="Upload a receipt, bank screenshot, or confirmation. Ben will fill the draft and await thy approval."
              file={imageFile}
              busy={scanning}
              onFileChange={setImageFile}
              onScan={() => void handleScanPayment()}
            />
          </RoomPanel>
        </div>

        <RoomPanel
          title="Recent Ledger Entries"
          subtitle={
            latestPayment
              ? `${latestPayment.merchant || "Latest"} — ${money(
                  latestPayment.amount
                )}`
              : "The ledger awaits its first victory."
          }
        >
          <div className="ledger-list">
            {payments.length === 0 ? (
              <div className="empty-ledger">
                No payments yet. The treasury ledger is ready.
              </div>
            ) : (
              payments.map((payment) => {
                const isDebt = !!payment.debt_id;
                const isBill = !!payment.bill_id;
                const isThisMonth =
                  (payment.date_iso || "").slice(0, 7) >=
                  currentMonthStart.slice(0, 7);

                return (
                  <div key={payment.id} className="ledger-row">
                    <div>
                      <div className="ledger-title-row">
                        <strong>{payment.merchant || "Payment"}</strong>
                        <span>{isDebt ? "💳 Debt" : isBill ? "📬 Bill" : "📜 Ledger"}</span>
                        {isThisMonth && <span className="green">This month</span>}
                      </div>
                      <div className="ledger-meta">
                        {payment.date_iso}
                        {payment.note ? ` • ${payment.note}` : ""}
                      </div>
                    </div>

                    <strong className="ledger-amount">
                      {money(payment.amount)}
                    </strong>
                  </div>
                );
              })
            )}
          </div>
        </RoomPanel>

        <div className="quote" style={panel}>
          🪶 “A penny saved is a penny earned.” — Benjamin Franklin
        </div>
      </div>

      <style jsx>{`
        .payments-page {
          min-height: 100vh;
          padding-top: clamp(220px, 30vh, 310px);
          padding-bottom: 96px;
          color: #fff7ed;
          font-family: var(--font-inter), system-ui, sans-serif;
          background:
            radial-gradient(circle at top, rgba(245, 196, 88, 0.16), transparent 34rem),
            linear-gradient(180deg, #070302, #160b04 45%, #050302);
        }

        .loading-page {
          display: grid;
          place-items: center;
          padding-top: 0;
        }

        .loading-card {
          border-radius: 28px;
          padding: 28px;
          color: #f8e7ba;
        }

        .hero {
          position: relative;
          min-height: 560px;
          overflow: hidden;
          border-bottom: 1px solid rgba(245, 196, 88, 0.28);
        }

        .hero-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(5, 3, 2, 0.92), rgba(5, 3, 2, 0.28) 48%, rgba(5, 3, 2, 0.84)),
            linear-gradient(180deg, rgba(5, 3, 2, 0.18), rgba(5, 3, 2, 0.95));
        }

        .hero-inner {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 0 auto;
          padding: 38px 18px 32px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #f8e7ba;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(245, 196, 88, 0.35);
          border-radius: 999px;
          padding: 10px 16px;
          text-decoration: none;
          margin-bottom: 18px;
        }

        .hero-copy {
          max-width: 620px;
        }

        .eyebrow {
          margin: 0;
          color: #facc15;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-size: 13px;
          font-weight: 900;
        }

        .hero-copy h1 {
          margin: 8px 0 10px;
          color: #fff7ed;
          font-size: clamp(48px, 8vw, 96px);
          line-height: 0.86;
          font-family: var(--font-cormorant), Georgia, serif;
          text-shadow: 0 6px 24px rgba(0, 0, 0, 0.75);
        }

        .hero-copy p {
          color: #e8d5b7;
          font-size: 18px;
          line-height: 1.45;
          max-width: 540px;
        }

        .stats-grid {
          margin-top: 26px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          max-width: 820px;
        }

        .stat-card {
          border-radius: 24px;
          padding: 18px;
        }

        .stat-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .stat-label {
          color: #b99b60;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .stat-value {
          color: #4ade80;
          font-size: 28px;
          font-weight: 900;
          margin-top: 6px;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .stat-helper {
          color: #d6c4a4;
          font-size: 13px;
          margin-top: 4px;
        }

        .content-wrap {
          max-width: 1180px;
          margin: -52px auto 0;
          padding: 0 18px;
          position: relative;
          z-index: 5;
          display: grid;
          gap: 18px;
        }

        .notice {
          border-radius: 22px;
          padding: 14px 16px;
        }

        .room-panel {
          border-radius: 28px;
          padding: 22px;
        }

        .room-head {
          border-bottom: 1px solid rgba(245, 196, 88, 0.18);
          padding-bottom: 14px;
          margin-bottom: 18px;
        }

        .room-head h2 {
          margin: 0;
          color: #f8e7ba;
          font-size: 28px;
          line-height: 1;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .room-head p {
          margin: 8px 0 0;
          color: #b99b60;
          font-size: 14px;
        }

        .work-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .full,
        .record-btn {
          grid-column: 1 / -1;
        }

        .pay-label {
          display: block;
          margin-bottom: 6px;
          color: #d9b86c;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .record-btn {
          border: 1px solid rgba(74, 222, 128, 0.65);
          border-radius: 20px;
          padding: 16px 18px;
          background: linear-gradient(180deg, rgba(22, 163, 74, 1), rgba(21, 128, 61, 1));
          color: #f0fdf4;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(22, 163, 74, 0.22);
        }

        .record-btn:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .ledger-list {
          display: grid;
          gap: 10px;
        }

        .empty-ledger {
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          color: #d6c4a4;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(245, 196, 88, 0.16);
        }

        .ledger-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(245, 196, 88, 0.14);
        }

        .ledger-title-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ledger-title-row strong {
          color: #f8e7ba;
          font-size: 16px;
        }

        .ledger-title-row span {
          color: #facc15;
          font-size: 12px;
          border: 1px solid rgba(250, 204, 21, 0.24);
          border-radius: 999px;
          padding: 3px 8px;
        }

        .ledger-title-row .green {
          color: #4ade80;
          border-color: rgba(74, 222, 128, 0.24);
        }

        .ledger-meta {
          color: #b99b60;
          font-size: 13px;
          margin-top: 5px;
        }

        .ledger-amount {
          color: #4ade80;
          font-size: 22px;
          font-family: var(--font-cormorant), Georgia, serif;
          white-space: nowrap;
        }

        .quote {
          border-radius: 24px;
          padding: 18px;
          color: #f8e7ba;
          text-align: center;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 20px;
        }

        @media (max-width: 900px) {
          .work-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .payments-page {
            padding-top: 250px;
          }

          .hero {
            min-height: 520px;
          }

          .hero-img {
            object-position: 48% top;
          }

          .hero-inner {
            padding: 32px 18px 28px;
          }

          .hero-copy h1 {
            font-size: 54px;
          }

          .hero-copy p {
            font-size: 17px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .ledger-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .ledger-amount {
            align-self: flex-end;
          }

          .content-wrap {
            margin-top: -28px;
          }
        }
      `}</style>
    </main>
  );
}
