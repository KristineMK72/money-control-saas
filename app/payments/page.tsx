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
    "linear-gradient(180deg, rgba(18,10,4,0.94), rgba(5,3,2,0.96))",
  border: "1px solid rgba(245, 196, 88, 0.32)",
  boxShadow:
    "0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid rgba(245,196,88,0.38)",
  background: "rgba(255,245,220,0.92)",
  color: "#24130a",
  padding: "12px 14px",
  outline: "none",
  fontSize: 16,
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 6,
        color: "#d9b86c",
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 800,
      }}
    >
      {children}
    </label>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
  danger,
}: {
  icon: string;
  label: string;
  value: string;
  helper?: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        ...panel,
        borderRadius: 24,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div
        style={{
          color: "#b99b60",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: danger ? "#fb7185" : "#4ade80",
          fontSize: 28,
          fontWeight: 900,
          marginTop: 6,
          fontFamily: "var(--font-cormorant), Georgia, serif",
        }}
      >
        {value}
      </div>
      {helper && (
        <div style={{ color: "#d6c4a4", fontSize: 13, marginTop: 4 }}>
          {helper}
        </div>
      )}
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
    <section style={{ ...panel, borderRadius: 28, padding: 22 }}>
      <div
        style={{
          borderBottom: "1px solid rgba(245,196,88,0.18)",
          paddingBottom: 14,
          marginBottom: 18,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#f8e7ba",
            fontSize: 28,
            lineHeight: 1,
            fontFamily: "var(--font-cormorant), Georgia, serif",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "8px 0 0", color: "#b99b60", fontSize: 14 }}>
            {subtitle}
          </p>
        )}
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
        (p) => (p.date_iso || p.created_at || "").slice(0, 10) >= currentMonthStart
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
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#050302",
          color: "#f8e7ba",
        }}
      >
        <div style={{ ...panel, borderRadius: 28, padding: 28 }}>
          Ben is opening the Treasury Hall ledger...
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(245,196,88,0.16), transparent 34rem), linear-gradient(180deg, #070302, #160b04 45%, #050302)",
        color: "#fff7ed",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        paddingBottom: 96,
      }}
    >
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

      <section
        style={{
          position: "relative",
          minHeight: "min(86vh, 760px)",
          overflow: "hidden",
          borderBottom: "1px solid rgba(245,196,88,0.28)",
        }}
      >
        <img
          src={TREASURY_IMAGE}
          alt="Treasury Hall"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(5,3,2,0.9), rgba(5,3,2,0.22) 48%, rgba(5,3,2,0.82)), linear-gradient(180deg, rgba(5,3,2,0.22), rgba(5,3,2,0.92))",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 1180,
            margin: "0 auto",
            padding: "96px 18px 32px",
          }}
        >
          <Link
            href="/world"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#f8e7ba",
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(245,196,88,0.35)",
              borderRadius: 999,
              padding: "10px 16px",
              textDecoration: "none",
              marginBottom: 18,
            }}
          >
            ← Back to Town
          </Link>

          <div style={{ maxWidth: 620 }}>
            <p
              style={{
                margin: 0,
                color: "#facc15",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              Treasury Hall
            </p>

            <h1
              style={{
                margin: "8px 0 10px",
                color: "#fff7ed",
                fontSize: "clamp(48px, 8vw, 96px)",
                lineHeight: 0.86,
                fontFamily: "var(--font-cormorant), Georgia, serif",
                textShadow: "0 6px 24px rgba(0,0,0,0.75)",
              }}
            >
              Payment Ledger
            </h1>

            <p
              style={{
                color: "#e8d5b7",
                fontSize: 18,
                lineHeight: 1.45,
                maxWidth: 540,
              }}
            >
              Record payments, scan proof, and let Ben stamp each victory into
              the colony ledger.
            </p>
          </div>

          <div
            style={{
              marginTop: 26,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              maxWidth: 820,
            }}
          >
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

      <div
        style={{
          maxWidth: 1180,
          margin: "-52px auto 0",
          padding: "0 18px",
          position: "relative",
          zIndex: 5,
          display: "grid",
          gap: 18,
        }}
      >
        {message && (
          <div
            style={{
              ...panel,
              borderRadius: 22,
              padding: "14px 16px",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
            gap: 18,
          }}
        >
          <RoomPanel
            title="Record Payment"
            subtitle={merchant || amount ? "Draft ready — review and stamp it." : "Enter a new victory for the treasury."}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
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

              <div style={{ gridColumn: "1 / -1" }}>
                <Label>{payType === "debt" ? "Select Debt" : "Select Bill"}</Label>

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
                        {bill.name} — {money(bill.monthly_target ?? bill.target ?? 0)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
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
                style={{
                  gridColumn: "1 / -1",
                  border: "1px solid rgba(74,222,128,0.65)",
                  borderRadius: 20,
                  padding: "16px 18px",
                  background:
                    "linear-gradient(180deg, rgba(22,163,74,1), rgba(21,128,61,1))",
                  color: "#f0fdf4",
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.65 : 1,
                  boxShadow: "0 14px 34px rgba(22,163,74,0.22)",
                }}
              >
                {saving ? "Recording..." : "🪙 Record Payment"}
              </button>
            </div>
          </RoomPanel>

          <RoomPanel
            title="Scan Payment Proof"
            subtitle={scanning ? "Ben is reading the proof..." : "Upload receipt, screenshot, or confirmation."}
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
              ? `${latestPayment.merchant || "Latest"} — ${money(latestPayment.amount)}`
              : "The ledger awaits its first victory."
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {payments.length === 0 ? (
              <div
                style={{
                  borderRadius: 20,
                  padding: 24,
                  textAlign: "center",
                  color: "#d6c4a4",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(245,196,88,0.16)",
                }}
              >
                No payments yet. The treasury ledger is ready.
              </div>
            ) : (
              payments.map((payment) => {
                const isDebt = !!payment.debt_id;
                const isBill = !!payment.bill_id;
                const isThisMonth =
                  (payment.date_iso || "").slice(0, 7) >= currentMonthStart.slice(0, 7);

                return (
                  <div
                    key={payment.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      padding: 16,
                      borderRadius: 20,
                      background: isThisMonth
                        ? "rgba(22,163,74,0.10)"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        isThisMonth
                          ? "rgba(74,222,128,0.26)"
                          : "rgba(245,196,88,0.14)"
                      }`,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ color: "#f8e7ba", fontSize: 16 }}>
                          {payment.merchant || "Payment"}
                        </strong>
                        <span
                          style={{
                            color: "#facc15",
                            fontSize: 12,
                            border: "1px solid rgba(250,204,21,0.24)",
                            borderRadius: 999,
                            padding: "3px 8px",
                          }}
                        >
                          {isDebt ? "💳 Debt" : isBill ? "📬 Bill" : "📜 Ledger"}
                        </span>
                        {isThisMonth && (
                          <span
                            style={{
                              color: "#4ade80",
                              fontSize: 12,
                              border: "1px solid rgba(74,222,128,0.24)",
                              borderRadius: 999,
                              padding: "3px 8px",
                            }}
                          >
                            This month
                          </span>
                        )}
                      </div>
                      <div style={{ color: "#b99b60", fontSize: 13, marginTop: 5 }}>
                        {payment.date_iso}
                        {payment.note ? ` • ${payment.note}` : ""}
                      </div>
                    </div>

                    <strong
                      style={{
                        color: isThisMonth ? "#4ade80" : "#facc15",
                        fontSize: 22,
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {money(payment.amount)}
                    </strong>
                  </div>
                );
              })
            )}
          </div>
        </RoomPanel>

        <div
          style={{
            ...panel,
            borderRadius: 24,
            padding: 18,
            color: "#f8e7ba",
            textAlign: "center",
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: 20,
          }}
        >
          🪶 “A penny saved is a penny earned.” — Benjamin Franklin
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: minmax(0, 1.2fr)"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          section {
            min-height: 640px !important;
          }

          img {
            object-position: 48% top !important;
          }

          div[style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
