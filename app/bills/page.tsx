"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import { clampMoney, money, addMoney } from "@/lib/money/math";
import { currentMonthStartISO, daysUntil } from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";
import { playCoins, playError, playCashRegister, playWrite } from "@/lib/sounds";

const POST_OFFICE_BG = "/D3F7077D-703F-49EE-8F9C-7709C1485D7B.png";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  target: number | string | null;
  monthly_target: number | string | null;
  category: string | null;
  due_date: string | null;
  due: string | null;
  due_day: number | string | null;
  is_monthly: boolean | null;
  focus: boolean | null;
  kind: string | null;
};

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number | string | null;
  min_payment: number | string | null;
  monthly_min_payment: number | string | null;
  due_date: string | null;
  due_day: number | null;
  apr: number | string | null;
};

type PaymentRow = {
  id: string;
  amount: number | string | null;
  bill_id: string | null;
  date_iso: string;
};

const BILL_CATS = [
  "household",
  "utilities",
  "transportation",
  "insurance",
  "subscriptions",
  "medical",
  "other",
];

function billAmount(b: BillRow) {
  return clampMoney(b.monthly_target ?? b.target);
}

function debtMin(d: DebtRow) {
  return clampMoney(d.monthly_min_payment ?? d.min_payment ?? 0);
}

function dueLabel(date: string | null) {
  const d = daysUntil(date);
  if (d === null) return "No due date posted";
  if (d < 0) return `Overdue ${Math.abs(d)} days`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due in ${d} days`;
}

export default function BillsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [activeTab, setActiveTab] = useState<"bill" | "debt">("bill");
  const [cardIndex, setCardIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [bName, setBName] = useState("");
  const [bAmt, setBAmt] = useState("");
  const [bCat, setBCat] = useState("household");
  const [bDue, setBDue] = useState("");
  const [bMo, setBMo] = useState(true);

  const [dName, setDName] = useState("");
  const [dBal, setDBal] = useState("");
  const [dMin, setDMin] = useState("");
  const [dKind, setDKind] = useState<"credit" | "loan">("credit");
  const [dDue, setDDue] = useState("");

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);
    await Promise.all([loadBills(user.id), loadDebts(user.id), loadPayments(user.id)]);
    setLoading(false);
  }

  async function loadBills(uid: string) {
    const { data } = await supabase.from("bills").select("*").eq("user_id", uid);
    setBills((data || []) as BillRow[]);
  }

  async function loadDebts(uid: string) {
    const { data } = await supabase.from("debts").select("*").eq("user_id", uid);
    setDebts((data || []) as DebtRow[]);
  }

  async function loadPayments(uid: string) {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, bill_id, date_iso")
      .eq("user_id", uid);

    setPayments((data || []) as PaymentRow[]);
  }

  function showMsg(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  }

  async function addBill() {
    if (!userId) return;

    const amount = clampMoney(bAmt);
    if (!bName.trim() || amount <= 0) {
      playError();
      showMsg("Enter a bill name and amount.");
      return;
    }

    setSaving(true);

    const dueDay = bDue ? new Date(`${bDue}T00:00:00`).getDate() : null;

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      name: bName.trim(),
      target: amount,
      monthly_target: bMo ? amount : null,
      category: bCat,
      due_date: bDue || null,
      due_day: dueDay,
      is_monthly: bMo,
    });

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    setBName("");
    setBAmt("");
    setBCat("household");
    setBDue("");
    setBMo(true);
    setShowAdd(false);

    playWrite();
    showMsg("Bill posted to the ledger.");
    await loadBills(userId);
  }

  async function addDebt() {
    if (!userId) return;

    if (!dName.trim()) {
      playError();
      showMsg("Enter a debt name.");
      return;
    }

    setSaving(true);

    const dueDay = dDue ? new Date(`${dDue}T00:00:00`).getDate() : null;
    const min = clampMoney(dMin) || null;

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name: dName.trim(),
      kind: dKind,
      balance: clampMoney(dBal),
      min_payment: min,
      monthly_min_payment: min,
      due_date: dDue || null,
      due_day: dueDay,
      is_monthly: true,
    });

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    setDName("");
    setDBal("");
    setDMin("");
    setDKind("credit");
    setDDue("");
    setShowAdd(false);

    playCoins();
    showMsg("Debt posted to the ledger.");
    await loadDebts(userId);
  }

  async function markBillPaid(id: string) {
    if (!userId) return;

    const bill = bills.find((b) => b.id === id);
    if (!bill) return;

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      bill_id: id,
      amount: billAmount(bill),
      date_iso: new Date().toISOString().slice(0, 10),
    });

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playCashRegister();
    showMsg("Payment recorded.");
    await loadPayments(userId);
  }

  const currentMonthStart = currentMonthStartISO();

  const paidThisMonth = useMemo(
    () =>
      addMoney(
        payments
          .filter((p) => p.date_iso >= currentMonthStart)
          .map((p) => clampMoney(p.amount))
      ),
    [payments, currentMonthStart]
  );

  const totalBillsAmt = useMemo(() => addMoney(bills.map(billAmount)), [bills]);
  const totalDebtMins = useMemo(() => addMoney(debts.map(debtMin)), [debts]);
  const totalDebtBal = useMemo(
    () => addMoney(debts.map((d) => clampMoney(d.balance))),
    [debts]
  );

  const totalDue = totalBillsAmt + totalDebtMins;
  const remaining = Math.max(0, totalDue - paidThisMonth);

  const priorityItems = useMemo<PriorityInput[]>(() => {
    const billItems: PriorityInput[] = bills.map((b) => ({
      id: b.id,
      type: "bill",
      name: b.name,
      amount: billAmount(b),
      due_date: b.due_date,
      due: b.due,
      due_day: b.due_day,
      category: b.category,
      kind: b.kind,
      focus: b.focus,
      is_paid_this_month: false,
    }));

    const debtItems: PriorityInput[] = debts.map((d) => ({
      id: d.id,
      type: "debt",
      name: d.name,
      amount: debtMin(d),
      balance: d.balance,
      due_date: d.due_date,
      due_day: d.due_day,
      apr: d.apr,
      focus: null,
      is_paid_this_month: false,
    }));

    return [...billItems, ...debtItems];
  }, [bills, debts]);

  const rankedItems = useMemo(() => prioritizeMoneyItems(priorityItems), [priorityItems]);
  const roomItems = rankedItems.filter((r) => r.item.type === activeTab);
  const activeItem = roomItems[cardIndex] ?? null;

  const overdue = addMoney(
    rankedItems
      .filter((r) => {
        const d = daysUntil(r.resolvedDueDate);
        return d !== null && d < 0;
      })
      .map((r) => r.amount)
  );

  const dueSoon = addMoney(
    rankedItems
      .filter((r) => {
        const d = daysUntil(r.resolvedDueDate);
        return d !== null && d >= 0 && d <= 7;
      })
      .map((r) => r.amount)
  );

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Post Office of Debts & Bills",
    totalNeeded: totalDue,
    incomeSoFar: paidThisMonth,
    incomeGap: remaining,
    dailyIncomeNeeded: Math.ceil(remaining / 30),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#c9a84c] font-cinzel">Opening the post office ledger…</p>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen bg-black text-[#f5e6c8]"
      style={{ fontFamily: "EB Garamond, serif" }}
    >
      <section className="relative mx-auto max-w-5xl">
        <img
          src={POST_OFFICE_BG}
          alt="Post Office of Debts and Bills"
          className="w-full h-auto block"
        />

        <button
          onClick={() => router.push("/world")}
          className="absolute left-4 top-4 rounded-full px-4 py-2 text-sm"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          ← Back to Town
        </button>

        <div className="absolute inset-x-0 top-4 text-center pointer-events-none px-20">
          <h1 className="font-cinzel text-2xl sm:text-4xl font-bold tracking-wide text-[#f5e6c8] drop-shadow">
            Post Office of Debts & Bills
          </h1>
          <p className="hidden sm:block italic text-[#d6c09a]">
            Letters, parcels, payments, accounts, receipts, and ledgers.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-24 -mt-4 sm:-mt-10">
        <div
          className="rounded-3xl p-4 sm:p-5"
          style={{
            background: "linear-gradient(180deg, rgba(8,5,3,.92), rgba(0,0,0,.98))",
            border: "1px solid rgba(201,168,76,.35)",
            boxShadow: "0 -30px 80px rgba(0,0,0,.85)",
          }}
        >
          <div
            className="mb-5 flex gap-3 rounded-2xl p-3"
            style={{
              background: "#fff7df",
              border: "1px solid rgba(201,168,76,.65)",
              color: "#1a0f0a",
            }}
          >
            <img
              src="/ben.png"
              alt="Ben"
              className="h-16 w-16 rounded-xl object-cover border border-[#c9a84c]"
            />
            <div>
              <p className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#8a3a12]">
                Ben&apos;s Almanack
              </p>
              <p className="text-lg font-bold leading-snug">
                Ben says: {ben.text}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {(["bill", "debt"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCardIndex(0);
                }}
                className="rounded-xl py-3 font-cinzel text-xl font-bold"
                style={{
                  background:
                    activeTab === tab
                      ? "linear-gradient(180deg, rgba(201,168,76,.42), rgba(70,40,10,.45))"
                      : "rgba(0,0,0,.45)",
                  border:
                    activeTab === tab
                      ? "1px solid rgba(251,191,36,.85)"
                      : "1px solid rgba(201,168,76,.25)",
                  color: activeTab === tab ? "#f5e6c8" : "#c9a84c",
                }}
              >
                {tab === "bill" ? "📋 Bills" : "💳 Debts"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2 sm:gap-4 mb-4">
            <button
              onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
              className="h-16 rounded-full font-cinzel"
              style={{ border: "1px solid rgba(201,168,76,.45)" }}
            >
              ◀
            </button>

            <div
              className="rounded-2xl p-5 text-center min-h-[220px]"
              style={{
                background: "rgba(0,0,0,.68)",
                border: "1px solid rgba(201,168,76,.45)",
              }}
            >
              {activeItem ? (
                <>
                  <p className="text-sm text-[#c9a84c]">
                    {cardIndex + 1} of {roomItems.length}
                  </p>
                  <h2 className="mt-2 font-cinzel text-3xl font-bold">
                    {activeItem.item.name}
                  </h2>
                  <p className="mt-2 text-[#d6c09a]">
                    {dueLabel(activeItem.resolvedDueDate)}
                  </p>
                  <p className="mt-4 text-4xl font-bold text-[#c9a84c]">
                    {money(activeItem.amount)}
                  </p>
                  <p className="mt-3 inline-block rounded-md bg-emerald-700 px-3 py-1 text-sm">
                    {activeTab === "bill" ? "Upcoming Bill" : "Debt Minimum"}
                  </p>

                  {activeTab === "bill" && (
                    <button
                      onClick={() => markBillPaid(activeItem.item.id)}
                      className="mt-4 block mx-auto rounded-xl px-5 py-2 font-bold"
                      style={{
                        background: "#166534",
                        border: "1px solid #4ade80",
                      }}
                    >
                      Mark Paid
                    </button>
                  )}
                </>
              ) : (
                <p className="pt-16 text-[#9a7d5a]">
                  No {activeTab === "bill" ? "bills" : "debts"} posted yet.
                </p>
              )}
            </div>

            <button
              onClick={() =>
                setCardIndex((i) => Math.min(roomItems.length - 1, i + 1))
              }
              className="h-16 rounded-full font-cinzel"
              style={{ border: "1px solid rgba(201,168,76,.45)" }}
            >
              ▶
            </button>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {roomItems.slice(0, 8).map((_, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full"
                style={{ background: i === cardIndex ? "#c9a84c" : "#5f5748" }}
              />
            ))}
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl overflow-hidden mb-6"
            style={{
              border: "1px solid rgba(201,168,76,.4)",
              background: "rgba(0,0,0,.58)",
            }}
          >
            <Metric icon="🪙" label="This Month Paid" value={money(paidThisMonth)} color="#4ade80" />
            <Metric icon="📋" label="Total Due" value={money(totalDue)} />
            <Metric icon="⏳" label="Overdue" value={money(overdue)} color="#ef4444" />
            <Metric icon="📅" label="Due Soon" value={money(dueSoon)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => router.push("/payments")}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}
            >
              ✍️ Make a Payment
            </button>

            <button
              onClick={() => setShowAdd((v) => !v)}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ background: "#166534", border: "1px solid #4ade80" }}
            >
              + Add New {activeTab === "bill" ? "Bill" : "Debt"}
            </button>

            <button
              onClick={() => router.push("/world")}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}
            >
              ↪ Exit to Town
            </button>
          </div>

          {showAdd && (
            <div
              className="mt-5 rounded-2xl p-4"
              style={{
                background: "rgba(15,8,4,.9)",
                border: "1px solid rgba(201,168,76,.35)",
              }}
            >
              {activeTab === "bill" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Bill Name" value={bName} onChange={setBName} />
                  <Input label="Amount" value={bAmt} onChange={setBAmt} type="number" />
                  <Select label="Category" value={bCat} onChange={setBCat} options={BILL_CATS} />
                  <Input label="Due Date" value={bDue} onChange={setBDue} type="date" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={bMo} onChange={(e) => setBMo(e.target.checked)} />
                    Repeats monthly
                  </label>
                  <button onClick={addBill} disabled={saving} className="rounded-xl bg-green-800 py-3 font-bold">
                    Save Bill
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Debt Name" value={dName} onChange={setDName} />
                  <Input label="Balance" value={dBal} onChange={setDBal} type="number" />
                  <Input label="Minimum Payment" value={dMin} onChange={setDMin} type="number" />
                  <Input label="Due Date" value={dDue} onChange={setDDue} type="date" />
                  <Select label="Type" value={dKind} onChange={(v) => setDKind(v as "credit" | "loan")} options={["credit", "loan"]} />
                  <button onClick={addDebt} disabled={saving} className="rounded-xl bg-green-800 py-3 font-bold">
                    Save Debt
                  </button>
                </div>
              )}
            </div>
          )}

          {message && (
            <p className="mt-4 rounded-xl bg-[#c9a84c]/20 px-4 py-3 text-center text-[#f5e6c8]">
              {message}
            </p>
          )}

          <p className="mt-6 text-center italic text-[#c9a84c]">
            “Well done is better than well said.” — Benjamin Franklin
          </p>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  color = "#c9a84c",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-4 text-center border-b sm:border-b-0 sm:border-r border-[#c9a84c]/20 last:border-r-0">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-xs uppercase tracking-widest text-[#d6c09a]">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[#c9a84c]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-black"
        style={{ background: "#f5e6c8" }}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[#c9a84c]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-black"
        style={{ background: "#f5e6c8" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
