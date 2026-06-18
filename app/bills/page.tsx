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

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  target: number;
  category: string | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  bill_id: string | null;
  date_iso: string;
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function monthKey(date: string | null) {
  if (!date) return "Unscheduled";
  return new Date(`${date}T00:00:00`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function BillsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("household");
  const [dueDate, setDueDate] = useState("");
  const [monthly, setMonthly] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", uid)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((data || []) as BillRow[]);
  }

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, bill_id, date_iso")
      .eq("user_id", uid);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((data || []) as PaymentRow[]);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setMessage("Sign in so Ben can stop staring at an empty bill stack.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await Promise.all([loadBills(user.id), loadPayments(user.id)]);
      setLoading(false);
    }

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function scanBillImage(file: File | null) {
    if (!file) return;

    setScanning(true);
    setMessage("Ben is scanning for a bill name and amount.");

    try {
      const { text } = await ocrImageFile(file);
      const parsed = parseTransactionsScreenshot(text);
      const first = parsed[0];

      if (!first) {
        setMessage("No clear bill found. Enter it manually and keep moving.");
        setScanning(false);
        return;
      }

      setName(first.merchant || "");
      if (first.amount) setAmount(String(first.amount));
      if (first.dateText && /^\d{4}-\d{2}-\d{2}$/.test(first.dateText)) {
        setDueDate(first.dateText);
      }
      setMessage("Scanner filled what it could. Give it the human eye.");
    } catch (error) {
      console.error("Bill scanner error:", error);
      setMessage("Scanner had trouble with that image. Manual entry still works.");
    }

    setScanning(false);
  }

  async function addBill() {
    setMessage("");

    if (!userId) return;

    const target = Number(amount);
    if (!name.trim() || !Number.isFinite(target) || target <= 0) {
      setMessage("Add a bill name and a valid amount.");
      return;
    }

    setSaving(true);
    const dueDay = dueDate ? new Date(`${dueDate}T00:00:00`).getDate() : null;

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      name: name.trim(),
      target,
      monthly_target: monthly ? target : null,
      category: category.trim() || null,
      due_date: dueDate || null,
      due_day: dueDay,
      is_monthly: monthly,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setAmount("");
    setCategory("household");
    setDueDate("");
    setMonthly(true);
    await loadBills(userId);
    setMessage("Bill added. Ben has placed it on the priority board.");
    setSaving(false);
  }

  async function deleteBill(id: string) {
    if (!userId) return;

    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((prev) => prev.filter((bill) => bill.id !== id));
    setMessage("Bill removed.");
  }

  const totalBills = bills.reduce(
    (sum, bill) => sum + Number(bill.monthly_target || bill.target || 0),
    0
  );
  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
  const remaining = Math.max(0, totalBills - totalPaid);

  const billsByMonth = useMemo(() => {
    const groups: Record<string, BillRow[]> = {};
    bills.forEach((bill) => {
      const key = monthKey(bill.due_date);
      groups[key] = [...(groups[key] || []), bill];
    });
    return Object.entries(groups);
  }, [bills]);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Bills",
    totalNeeded: totalBills,
    incomeSoFar: totalPaid,
    incomeGap: remaining,
    dailyIncomeNeeded: Math.ceil(remaining / 30),
  });

  const billMood =
    remaining > totalBills * 0.75 ? "/ben-overdraft.png" : "/ben-recovery.png";

  if (loading) {
    return (
      <AppShell max="max-w-5xl">
        <Panel>Loading bills...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell max="max-w-5xl">
      <PageHeader
        eyebrow="AskBen Bills"
        title="Bills"
        subtitle="Keep the must-pay stuff visible, sorted, and less emotionally loud."
      />

      {message && <Notice>{message}</Notice>}

      <ScrollRevealCard
        title="Ben's Bill Briefing"
        subtitle="A quick read on your obligations"
        image={billMood}
        defaultOpen
      >
        <DarkPanel>
          <BenBubble message={ben.text} mood={ben.mood} />
        </DarkPanel>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Total bills" value={money(totalBills)} tone="amber" />
          <MetricCard label="Paid" value={money(totalPaid)} tone="emerald" />
          <MetricCard label="Remaining" value={money(remaining)} tone="rose" />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Add Bill"
        subtitle="Create a new obligation for the ledger"
        image="/ben-thinking.png"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Panel>
            <h2 className="text-2xl font-black">Add Bill</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bill name"
                className={inputClass}
              />

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount due"
                inputMode="decimal"
                className={inputClass}
              />

              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
                className={inputClass}
              />

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={monthly}
                  onChange={(e) => setMonthly(e.target.checked)}
                />
                Repeat monthly
              </label>
            </div>

            <button
              onClick={addBill}
              disabled={saving || !userId}
              className={`${moneyButtonClass} mt-5 w-full`}
            >
              {saving ? "Saving..." : "Add Bill"}
            </button>
          </Panel>

          <PaperScrollScanner
            title="Scan Bill"
            description="Upload a statement, utility notice, or screenshot. Ben will try to prefill the bill name, amount, and date."
            file={imageFile}
            busy={scanning}
            onFileChange={setImageFile}
            onScan={() => void scanBillImage(imageFile)}
          />
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Bill Board"
        subtitle={`${bills.length} obligations grouped by due month`}
        image="/ben-mastermind.png"
        defaultOpen
      >
        <h2 className="text-2xl font-black text-zinc-950">Bill Board</h2>

        <div className="mt-5 space-y-4">
          {billsByMonth.length === 0 ? (
            <p className="text-sm font-semibold text-zinc-600">
              No bills yet. A rare and suspicious calm.
            </p>
          ) : (
            billsByMonth.map(([group, groupBills]) => {
              const open = expandedGroups[group] ?? true;

              return (
                <div
                  key={group}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <button
                    onClick={() =>
                      setExpandedGroups((prev) => ({ ...prev, [group]: !open }))
                    }
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="font-black">{group}</span>
                    <span className="text-sm font-black text-zinc-500">
                      {open ? "Hide" : "Show"} {groupBills.length}
                    </span>
                  </button>

                  {open && (
                    <div className="mt-4 grid gap-3">
                      {groupBills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-black">{bill.name}</p>
                            <p className="text-sm font-semibold text-zinc-600">
                              {bill.category || "Uncategorized"}
                              {bill.due_date ? ` - due ${bill.due_date}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="text-lg font-black">
                              {money(Number(bill.target || 0))}
                            </p>

                            <button
                              onClick={() => void deleteBill(bill.id)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollRevealCard>
    </AppShell>
  );
}
