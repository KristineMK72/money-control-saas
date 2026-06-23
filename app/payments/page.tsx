"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  DarkPanel,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  inputClass,
  moneyButtonClass,
} from "@/components/AppFrame";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import ScrollRevealCard from "@/components/ScrollRevealCard";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";
import { clampMoney, money } from "@/lib/money/math";
import { todayISO } from "@/lib/money/utils";
import { currentMonthStartISO } from "@/lib/money/dates";

import type { Payment, Debt, Bill } from "@/lib/money/types";

export default function PaymentsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payType, setPayType] = useState<"debt" | "bill">("debt");
  const [debtId, setDebtId] = useState("");
  const [billId, setBillId] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
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
      setMessage(error.message);
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
      setMessage(error.message);
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
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const user = data.session?.user;

      if (!user) {
        setMessage("Sign in so Ben can witness the payments.");
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
    setMessage("Ben is reading the payment proof.");

    try {
      const { text } = await ocrImageFile(imageFile);
      const first = parseTransactionsScreenshot(text)[0];

      if (!first) {
        setMessage("No clear payment found. Fill it in manually and proceed.");
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
      setMessage("Scanner filled what it could. Review before saving.");
    } catch (error) {
      console.error("Payment scanner error:", error);
      setMessage("Scanner had trouble with that proof. Manual entry still works.");
    }

    setScanning(false);
  }

  async function handleAddPayment() {
    setMessage("");

    if (!userId) return;

    const amt = clampMoney(amount);

    if (!merchant.trim() || amt <= 0) {
      setMessage("Enter a payment name and amount.");
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

    setSaving(true);

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
      setMessage(error.message);
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

    setMessage("Payment added. A fine entry for the ledger.");
    setSaving(false);
  }

  const currentMonthStart = currentMonthStartISO();

  const monthlyPayments = useMemo(() => {
    return payments.filter((payment) => {
      const date = (payment.date_iso || payment.created_at || "").slice(0, 10);
      return date >= currentMonthStart;
    });
  }, [payments, currentMonthStart]);

  const monthlyTotal = useMemo(() => {
    return monthlyPayments.reduce(
      (sum, payment) => sum + clampMoney(payment.amount),
      0
    );
  }, [monthlyPayments]);

  const allTimeTotal = useMemo(() => {
    return payments.reduce((sum, payment) => {
      return sum + clampMoney(payment.amount);
    }, 0);
  }, [payments]);

  const latestPayment = payments[0];
  const latestMonthlyPayment = monthlyPayments[0];

  const debtPayments = payments.filter((p) => p.debt_id).length;
  const billPayments = payments.filter((p) => p.bill_id).length;

  const monthlyDebtPayments = monthlyPayments.filter((p) => p.debt_id).length;
  const monthlyBillPayments = monthlyPayments.filter((p) => p.bill_id).length;

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Payments",
    totalNeeded: allTimeTotal,
    incomeSoFar: allTimeTotal,
    incomeGap: 0,
    dailyIncomeNeeded: 0,
  });

  const paymentMood =
    allTimeTotal > 0 ? "/ben-winning.png" : "/ben-thinking.png";

  if (loading) {
    return (
      <AppShell max="max-w-5xl">
        <Panel>Loading payments...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell max="max-w-5xl">
      <PageHeader
        eyebrow="AskBen Payments"
        title="Payments"
        subtitle="Record proof that you handled business. Ben respects evidence."
      />

      {message && <Notice>{message}</Notice>}

      <ScrollRevealCard
        title="Payment Victory Briefing"
        subtitle="Monthly progress and lifetime totals"
        image={paymentMood}
        defaultOpen
      >
        <DarkPanel>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </DarkPanel>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <MetricCard
            label="Paid this month"
            value={money(monthlyTotal)}
            helper={
              latestMonthlyPayment
                ? `${latestMonthlyPayment.merchant || "Latest"} - ${money(
                    latestMonthlyPayment.amount
                  )}`
                : "No payments this month yet"
            }
            tone="emerald"
          />

          <MetricCard
            label="Payments this month"
            value={String(monthlyPayments.length)}
            helper={`${monthlyDebtPayments} debt • ${monthlyBillPayments} bill`}
            tone="sky"
          />

          <MetricCard
            label="All-time Total"
            value={money(allTimeTotal)}
            helper="Cumulative payment total"
            tone="emerald"
          />

          <MetricCard
            label="All-time payments"
            value={String(payments.length)}
            helper={`${debtPayments} debt • ${billPayments} bill`}
            tone="zinc"
          />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Scan Payment Proof"
        subtitle={
          scanning
            ? "Ben is reading the proof..."
            : "Upload receipt, screenshot, or confirmation"
        }
        image="/ben-mastermind.png"
      >
        <PaperScrollScanner
          title="Scan Payment Proof"
          description="Upload a receipt, bank screenshot, or confirmation. Ben will fill the draft and await thy approval."
          file={imageFile}
          busy={scanning}
          onFileChange={setImageFile}
          onScan={() => void handleScanPayment()}
        />
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Add Payment"
        subtitle={merchant || amount ? "Draft ready for review" : "Record a victory"}
        image="/ben-thinking.png"
        defaultOpen
      >
        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className={inputClass}
          />

          <input
            placeholder="What did you pay?"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className={inputClass}
          />

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />

          <select
            value={payType}
            onChange={(e) => {
              setPayType(e.target.value as "debt" | "bill");
              setDebtId("");
              setBillId("");
            }}
            className={inputClass}
          >
            <option value="debt">Debt</option>
            <option value="bill">Bill</option>
          </select>

          {payType === "debt" ? (
            <select
              value={debtId}
              onChange={(e) => setDebtId(e.target.value)}
              className={`${inputClass} md:col-span-2`}
            >
              <option value="">Select debt</option>

              {debts.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {debt.name}
                  {debt.balance != null
                    ? ` - ${money(debt.balance)} balance`
                    : ""}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
              className={`${inputClass} md:col-span-2`}
            >
              <option value="">Select bill</option>

              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.name} - {money(bill.monthly_target ?? bill.target ?? 0)}
                </option>
              ))}
            </select>
          )}

          <textarea
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} min-h-24 md:col-span-2`}
          />

          <button
            onClick={handleAddPayment}
            disabled={saving}
            className={`${moneyButtonClass} md:col-span-2`}
          >
            {saving ? "Saving..." : "Add Payment"}
          </button>
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Payment History"
        subtitle={
          latestPayment
            ? `${latestPayment.merchant || "Latest payment"} - ${money(
                latestPayment.amount
              )}`
            : "The ledger awaits its first victory"
        }
        image="/ben-recovery.png"
        defaultOpen
      >
        <div className="grid gap-3">
          {payments.length === 0 ? (
            <p className="text-sm font-semibold text-zinc-600">
              No payments yet. The ledger awaits its first victory.
            </p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-black">{payment.merchant || "Payment"}</p>

                  <p className="text-sm font-semibold text-zinc-600">
                    {payment.date_iso}
                    {payment.debt_id ? " • Debt payment" : ""}
                    {payment.bill_id ? " • Bill payment" : ""}
                    {payment.note ? ` • ${payment.note}` : ""}
                  </p>
                </div>

                <p className="text-lg font-black">{money(payment.amount)}</p>
              </div>
            ))
          )}
        </div>
      </ScrollRevealCard>
    </AppShell>
  );
}
