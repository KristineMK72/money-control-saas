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

const TREASURY_BG = "/058223E5-4FAA-4CF8-851C-05CBEE73C881.png";

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
    window.setTimeout(() => setMessage(""), 4500);
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
        notify("Sign in to record payments.", "info");
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

      if (first.amount) {
        setAmount(String(first.amount));
      }

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
        (payment) =>
          (payment.date_iso || payment.created_at || "").slice(0, 10) >=
          currentMonthStart
      ),
    [payments, currentMonthStart]
  );

  const monthlyTotal = useMemo(
    () => monthlyPayments.reduce((sum, payment) => sum + clampMoney(payment.amount), 0),
    [monthlyPayments]
  );

  const allTimeTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + clampMoney(payment.amount), 0),
    [payments]
  );

  const latestPayment = payments[0];
  const debtPayments = payments.filter((payment) => payment.debt_id).length;
  const billPayments = payments.filter((payment) => payment.bill_id).length;
  const monthlyDebtPay = monthlyPayments.filter((payment) => payment.debt_id).length;
  const monthlyBillPay = monthlyPayments.filter((payment) => payment.bill_id).length;

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Treasury",
    totalNeeded: allTimeTotal,
    incomeSoFar: allTimeTotal,
    incomeGap: 0,
    dailyIncomeNeeded: 0,
  });

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-black text-[#f5e6c8]">
        <div className="rounded-3xl border border-[#c9a84c]/40 bg-black/80 px-8 py-6">
          Opening the Treasury Ledger...
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
            notify("Debt cleared from the ledger. Well done!", "ok");
          }}
        />
      )}

      <section className="hero">
        <div className="hero-frame">
          <img src={TREASURY_BG} alt="Treasury Hall" className="hero-img" />
          <div className="hero-shade" />

          <div className="hero-top">
            <Link href="/world" className="back-btn">
              ← Back to Town
            </Link>
          </div>

          <div className="hero-title">
            <p className="eyebrow">Treasury Hall</p>
            <h1>Payment Ledger</h1>
            <p className="hero-sub">
              Record payments, scan proof, and let Ben stamp each victory into
              the colony ledger.
            </p>
          </div>
        </div>
      </section>

      <div className="desk-content">
        <div className="stats-grid">
          <MetricTile
            icon="🪙"
            label="Paid This Month"
            value={money(monthlyTotal)}
            helper={`${monthlyPayments.length} payments`}
          />
          <MetricTile
            icon="📜"
            label="All-Time Paid"
            value={money(allTimeTotal)}
            helper={`${payments.length} entries`}
          />
          <MetricTile
            icon="💳"
            label="Debt Payments"
            value={String(debtPayments)}
            helper={`${monthlyDebtPay} this month`}
          />
          <MetricTile
            icon="📬"
            label="Bill Payments"
            value={String(billPayments)}
            helper={`${monthlyBillPay} this month`}
          />
        </div>

        {message && <div className={`notice ${msgType}`}>{message}</div>}

        <ColonialCard>
          <h2>Ben’s Treasury Briefing</h2>
          <p className="card-sub">
            A quick word from the desk before the ledger opens.
          </p>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </ColonialCard>

        <div className="work-grid">
          <ColonialCard>
            <h2>Record Payment</h2>
            <p className="card-sub">
              {merchant || amount
                ? "Draft ready — review and stamp it."
                : "Enter a new victory for the treasury."}
            </p>

            <div className="form-grid">
              <Field label="Date">
                <input
                  type="date"
                  value={dateISO}
                  onChange={(event) => setDateISO(event.target.value)}
                />
              </Field>

              <Field label="Payment Name">
                <input
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  placeholder="Car payment, Credit One, rent..."
                />
              </Field>

              <Field label="Amount">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Payment Type">
                <select
                  value={payType}
                  onChange={(event) => {
                    setPayType(event.target.value as "debt" | "bill");
                    setDebtId("");
                    setBillId("");
                  }}
                >
                  <option value="debt">💳 Debt Payment</option>
                  <option value="bill">📬 Bill Payment</option>
                </select>
              </Field>

              <Field label={payType === "debt" ? "Select Debt" : "Select Bill"} full>
                {payType === "debt" ? (
                  <select
                    value={debtId}
                    onChange={(event) => setDebtId(event.target.value)}
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
                    onChange={(event) => setBillId(event.target.value)}
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
              </Field>

              <Field label="Note" full>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Optional note for the ledger..."
                />
              </Field>

              <button
                onClick={handleAddPayment}
                disabled={saving}
                className="record-btn"
              >
                {saving ? "Recording..." : "🪙 Record Payment"}
              </button>
            </div>
          </ColonialCard>

          <ColonialCard>
            <h2>Scan Payment Proof</h2>
            <p className="card-sub">Upload receipt, screenshot, or confirmation.</p>
            <PaperScrollScanner
              title="Scan Payment Proof"
              description="Upload receipt, screenshot, or confirmation. Ben will fill the draft."
              file={imageFile}
              busy={scanning}
              onFileChange={setImageFile}
              onScan={() => void handleScanPayment()}
            />
          </ColonialCard>
        </div>

        <ColonialCard>
          <h2>Recent Ledger Entries</h2>
          <p className="card-sub">
            {latestPayment
              ? `${latestPayment.merchant || "Latest"} — ${money(
                  latestPayment.amount
                )}`
              : "The ledger awaits its first victory."}
          </p>

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
                      <div className="ledger-title">
                        <strong>{payment.merchant || "Payment"}</strong>
                        <span>
                          {isDebt ? "💳 Debt" : isBill ? "📬 Bill" : "📜 Ledger"}
                        </span>
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
        </ColonialCard>

        <div className="quote">
          “A penny saved is a penny earned.” — Benjamin Franklin
        </div>
      </div>

      <style jsx>{`
        .payments-page {
          min-height: 100vh;
          padding-top: 250px;
          padding-bottom: 100px;
          background:
            radial-gradient(circle at top, rgba(245, 196, 88, 0.12), transparent 32rem),
            linear-gradient(180deg, #050302, #140a04 45%, #050302);
          color: #fff7ed;
        }

        .hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px;
        }

        .hero-frame {
          position: relative;
          width: 100%;
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid rgba(201, 168, 76, 0.35);
          background: #050302;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.65);
        }

        .hero-img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 620px;
          object-fit: contain;
          object-position: center;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(5, 3, 2, 0.08), rgba(5, 3, 2, 0.18) 45%, rgba(5, 3, 2, 0.82)),
            linear-gradient(90deg, rgba(5, 3, 2, 0.55), transparent 45%, rgba(5, 3, 2, 0.35));
        }

        .hero-top {
          position: absolute;
          top: 18px;
          left: 18px;
          z-index: 2;
        }

        .back-btn {
          display: inline-flex;
          color: #f5e6c8;
          text-decoration: none;
          border: 1px solid rgba(201, 168, 76, 0.4);
          background: rgba(0, 0, 0, 0.62);
          border-radius: 999px;
          padding: 10px 16px;
        }

        .hero-title {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 22px;
          z-index: 2;
          max-width: 660px;
        }

        .eyebrow {
          color: #facc15;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 900;
          font-size: 13px;
          margin: 0 0 8px;
        }

        h1 {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(48px, 8vw, 88px);
          line-height: 0.88;
          margin: 0;
          text-shadow: 0 8px 28px rgba(0, 0, 0, 0.9);
        }

        .hero-sub {
          max-width: 620px;
          font-size: 19px;
          line-height: 1.35;
          color: #ead9bd;
          margin: 12px 0 0;
        }

        .desk-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 18px 18px;
          display: grid;
          gap: 18px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .notice {
          border-radius: 20px;
          padding: 14px 16px;
          border: 1px solid rgba(201, 168, 76, 0.35);
          background: rgba(15, 8, 4, 0.9);
          color: #facc15;
        }

        .notice.err {
          color: #fb7185;
          border-color: rgba(251, 113, 133, 0.5);
        }

        .notice.info {
          color: #93c5fd;
          border-color: rgba(147, 197, 253, 0.5);
        }

        .work-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
          gap: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field.full,
        .record-btn {
          grid-column: 1 / -1;
        }

        label {
          display: block;
          color: #d6c09a;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 900;
          margin-bottom: 7px;
        }

        input,
        select,
        textarea {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(201, 168, 76, 0.45);
          background: rgba(255, 245, 220, 0.95);
          color: #24130a;
          padding: 13px 14px;
          font-size: 16px;
          outline: none;
        }

        .record-btn {
          border: 1px solid rgba(74, 222, 128, 0.65);
          border-radius: 20px;
          padding: 16px 18px;
          background: linear-gradient(180deg, #16a34a, #15803d);
          color: #f0fdf4;
          font-size: 18px;
          font-weight: 900;
        }

        .record-btn:disabled {
          opacity: 0.6;
        }

        .ledger-list {
          display: grid;
          gap: 10px;
        }

        .empty-ledger,
        .ledger-row {
          border-radius: 18px;
          border: 1px solid rgba(201, 168, 76, 0.18);
          background: rgba(255, 255, 255, 0.04);
          padding: 16px;
        }

        .ledger-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .ledger-title {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ledger-title strong {
          color: #f5e6c8;
        }

        .ledger-title span {
          color: #facc15;
          font-size: 12px;
          border: 1px solid rgba(250, 204, 21, 0.24);
          border-radius: 999px;
          padding: 3px 8px;
        }

        .ledger-title .green {
          color: #4ade80;
          border-color: rgba(74, 222, 128, 0.28);
        }

        .ledger-meta {
          color: #b99b60;
          font-size: 13px;
          margin-top: 5px;
        }

        .ledger-amount {
          color: #4ade80;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 24px;
          white-space: nowrap;
        }

        .quote {
          text-align: center;
          color: #d6c09a;
          font-style: italic;
          padding: 18px;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .work-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .payments-page {
            padding-top: 250px;
          }

          .hero {
            padding: 12px;
          }

          .hero-frame {
            border-radius: 24px;
          }

          .hero-img {
            max-height: 420px;
          }

          .hero-top {
            top: 12px;
            left: 12px;
          }

          .back-btn {
            padding: 8px 13px;
            font-size: 14px;
          }

          .hero-title {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }

          h1 {
            font-size: 46px;
          }

          .hero-sub {
            font-size: 16px;
          }

          .stats-grid,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .ledger-row {
            flex-direction: column;
          }

          .ledger-amount {
            align-self: flex-end;
          }
        }
      `}</style>
    </main>
  );
}

function ColonialCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`colonial-card ${className}`}>
      {children}

      <style jsx>{`
        .colonial-card {
          border-radius: 28px;
          padding: 22px;
          background: linear-gradient(
            180deg,
            rgba(18, 10, 4, 0.94),
            rgba(5, 3, 2, 0.97)
          );
          border: 1px solid rgba(201, 168, 76, 0.34);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
        }

        h2 {
          margin: 0;
          color: #f5e6c8;
          font-size: 30px;
          line-height: 1;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .card-sub {
          color: #b99b60;
          margin: 8px 0 18px;
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "field full" : "field"}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function MetricTile({
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
    <div className="metric-tile">
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {helper && <div className="metric-helper">{helper}</div>}

      <style jsx>{`
        .metric-tile {
          border-radius: 24px;
          padding: 18px;
          background: linear-gradient(
            180deg,
            rgba(18, 10, 4, 0.94),
            rgba(5, 3, 2, 0.97)
          );
          border: 1px solid rgba(201, 168, 76, 0.32);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.42);
        }

        .metric-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .metric-label {
          color: #b99b60;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .metric-value {
          color: #4ade80;
          font-size: 30px;
          font-weight: 900;
          margin-top: 6px;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .metric-helper {
          color: #d6c09a;
          font-size: 13px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
