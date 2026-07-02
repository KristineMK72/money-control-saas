"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import BenBubble from "@/components/BenBubble";
import { clampMoney, money, addMoney } from "@/lib/money/math";
import { currentMonthStartISO, daysUntil } from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
  type PriorityResult,
} from "@/lib/money/priorityV2";
import { playCoins, playError, playCashRegister, playWrite } from "@/lib/sounds";

/* ─── Background image ─── */

const POST_OFFICE_BG = "/D3F7077D-703F-49EE-8F9C-7709C1485D7B.png";

/* ─── Types ─── */

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  target: number | string | null;
  category: string | null;
  due_date: string | null;
  due: string | null;
  due_day: number | string | null;
  is_monthly: boolean | null;
  monthly_target: number | string | null;
  focus: boolean | null;
  kind: string | null;
  created_at: string;
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
  apr: number | string | null;
  credit_limit: number | string | null;
  note: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  amount: number | string | null;
  bill_id: string | null;
  date_iso: string;
};

/* ─── Helpers ─── */

function billAmount(b: BillRow) {
  return clampMoney(b.monthly_target ?? b.target);
}

function debtMin(d: DebtRow) {
  return clampMoney(d.monthly_min_payment ?? d.min_payment ?? 0);
}

function dueChip(date: string | null): { label: string; color: string } {
  const days = daysUntil(date);
  if (days === null) return { label: "No due date", color: "#9a7d5a" };
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, color: "#f87171" };
  if (days === 0) return { label: "Due today", color: "#fb923c" };
  if (days === 1) return { label: "Due tomorrow", color: "#fbbf24" };
  if (days <= 7) return { label: `${days}d left`, color: "#facc15" };
  return { label: `${days}d`, color: "#9a7d5a" };
}

/* ─── Sub-components ─── */

function ColonialCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{
        background: "rgba(15,8,4,0.88)",
        border: "1px solid rgba(107,68,35,0.55)",
        backdropFilter: "blur(6px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}

function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-1 font-cinzel text-[11px] font-semibold uppercase tracking-widest"
      style={{ color: "#9a7d5a" }}
    >
      {children}
    </p>
  );
}

function ParchmentInput({
  type = "text",
  value,
  onChange,
  placeholder,
  step,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md px-3 py-2 focus:outline-none"
      style={{
        background: "#f5e6c8",
        color: "#2d1810",
        border: "1px solid #c9a84c",
        fontFamily: "EB Garamond, serif",
        fontSize: "15px",
      }}
    />
  );
}

function ParchmentSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer appearance-none rounded-md px-3 py-2 focus:outline-none"
      style={{
        background: "#f5e6c8",
        color: "#2d1810",
        border: "1px solid #c9a84c",
        fontFamily: "EB Garamond, serif",
        fontSize: "15px",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3"
      style={{
        background: "rgba(107,68,35,0.18)",
        border: "1px solid rgba(201,168,76,0.25)",
      }}
    >
      <span className="shrink-0 text-2xl">{icon}</span>
      <div>
        <p
          className="font-cinzel text-[10px] uppercase tracking-wider"
          style={{ color: "#9a7d5a" }}
        >
          {label}
        </p>
        <p className="text-base font-bold" style={{ color: "#c9a84c" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ObligationItem({
  result,
  onPay,
  onDelete,
}: {
  result: PriorityResult;
  onPay?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { item, score, resolvedDueDate, amount, reasons } = result;
  const chip = dueChip(resolvedDueDate);
  const isBill = item.type === "bill";
  const isPaid = item.is_paid_this_month;

  const urgencyColor =
    score > 900 ? "#f87171" : score > 500 ? "#fb923c" : score > 200 ? "#fbbf24" : "#9a7d5a";

  const urgencyIcon =
    score > 900 ? "🔥" : score > 500 ? "⚠️" : score > 200 ? "📌" : isBill ? "📋" : "💳";

  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3"
      style={{
        background: isPaid ? "rgba(45,90,39,0.12)" : "rgba(15,8,4,0.78)",
        border: isPaid
          ? "1px solid rgba(74,220,128,0.3)"
          : score > 500
            ? `1px solid ${urgencyColor}40`
            : "1px solid rgba(107,68,35,0.4)",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{
          background: `${urgencyColor}18`,
          border: `1px solid ${urgencyColor}40`,
        }}
      >
        {urgencyIcon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: isBill ? "rgba(45,90,39,0.3)" : "rgba(107,68,35,0.3)",
              color: isBill ? "#4ade80" : "#c9a84c",
              border: isBill
                ? "1px solid rgba(74,220,128,0.3)"
                : "1px solid rgba(201,168,76,0.3)",
            }}
          >
            {isBill ? "Bill" : "Debt"}
          </span>

          <p className="truncate text-sm font-semibold" style={{ color: "#e8d5b7" }}>
            {item.name}
          </p>

          {isPaid && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px]"
              style={{
                background: "rgba(74,220,128,0.15)",
                color: "#4ade80",
                border: "1px solid rgba(74,220,128,0.3)",
              }}
            >
              ✓ Paid
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-1">
          {reasons.slice(0, 2).map((r) => (
            <span
              key={r}
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{
                background: "rgba(107,68,35,0.2)",
                color: "#9a7d5a",
              }}
            >
              {r}
            </span>
          ))}

          {resolvedDueDate && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{
                background: "rgba(107,68,35,0.2)",
                color: chip.color,
              }}
            >
              {chip.label}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="mb-1 text-sm font-bold" style={{ color: "#c9a84c" }}>
          {money(amount)}
        </p>

        <div className="flex justify-end gap-1">
          {isBill && onPay && !isPaid && (
            <button
              onClick={() => onPay(item.id)}
              className="rounded-lg px-2 py-1 text-[10px] font-bold"
              style={{
                background: "rgba(45,90,39,0.3)",
                color: "#4ade80",
                border: "1px solid rgba(74,220,128,0.3)",
              }}
            >
              Mark Paid
            </button>
          )}

          <button
            onClick={() => onDelete(item.id)}
            className="rounded-lg px-2 py-1 text-[10px]"
            style={{
              background: "rgba(248,113,113,0.1)",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.2)",
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

const BILL_CATS = [
  "household",
  "utilities",
  "transportation",
  "insurance",
  "subscriptions",
  "medical",
  "other",
];

export default function BillsPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");
  const [addTab, setAddTab] = useState<"bill" | "debt">("bill");

  const [bName, setBName] = useState("");
  const [bAmt, setBAmt] = useState("");
  const [bCat, setBCat] = useState("household");
  const [bDue, setBDue] = useState("");
  const [bMo, setBMo] = useState(true);

  const [dName, setDName] = useState("");
  const [dBal, setDBal] = useState("");
  const [dMin, setDMin] = useState("");
  const [dApr, setDApr] = useState("");
  const [dKind, setDKind] = useState<"credit" | "loan">("credit");
  const [dDue, setDDue] = useState("");
  const [dLimit, setDLimit] = useState("");

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
    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", uid)
      .order("due_date", { ascending: true, nullsFirst: false });

    setBills((data || []) as BillRow[]);
  }

  async function loadDebts(uid: string) {
    const { data } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    setDebts((data || []) as DebtRow[]);
  }

  async function loadPayments(uid: string) {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, bill_id, date_iso")
      .eq("user_id", uid);

    setPayments((data || []) as PaymentRow[]);
  }

  function showMsg(text: string, type: "ok" | "err" = "ok") {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(""), 4000);
  }

  async function addBill() {
    if (!userId) return;

    const target = clampMoney(bAmt);

    if (!bName.trim() || target <= 0) {
      playError();
      showMsg("Enter a name and valid amount.", "err");
      return;
    }

    setSaving(true);

    const dueDay = bDue ? new Date(`${bDue}T00:00:00`).getDate() : null;

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      name: bName.trim(),
      target,
      monthly_target: bMo ? target : null,
      category: bCat || null,
      due_date: bDue || null,
      due_day: dueDay,
      is_monthly: bMo,
    });

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message, "err");
      return;
    }

    setBName("");
    setBAmt("");
    setBCat("household");
    setBDue("");
    setBMo(true);

    playWrite();
    showMsg("Bill added to the post office ledger.");
    await loadBills(userId);
  }

  async function addDebt() {
    if (!userId) return;

    const bal = clampMoney(dBal);

    if (!dName.trim()) {
      playError();
      showMsg("Debt name required.", "err");
      return;
    }

    setSaving(true);

    const dueDay = dDue ? new Date(`${dDue}T00:00:00`).getDate() : null;
    const minAmt = clampMoney(dMin) || null;

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name: dName.trim(),
      kind: dKind,
      balance: bal,
      min_payment: minAmt,
      monthly_min_payment: minAmt,
      apr: clampMoney(dApr) || null,
      credit_limit: clampMoney(dLimit) || null,
      due_date: dDue || null,
      due_day: dueDay,
      is_monthly: true,
    });

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message, "err");
      return;
    }

    setDName("");
    setDBal("");
    setDMin("");
    setDApr("");
    setDKind("credit");
    setDDue("");
    setDLimit("");

    playCoins();
    showMsg("Debt recorded in the post office ledger.");
    await loadDebts(userId);
  }

  async function deleteBill(id: string) {
    if (!userId) return;

    await supabase.from("bills").delete().eq("id", id).eq("user_id", userId);
    setBills((p) => p.filter((b) => b.id !== id));
    showMsg("Bill removed.");
  }

  async function deleteDebt(id: string) {
    if (!userId) return;

    await supabase.from("debts").delete().eq("id", id).eq("user_id", userId);
    setDebts((p) => p.filter((d) => d.id !== id));
    showMsg("Debt removed.");
  }

  async function markBillPaid(billId: string) {
    if (!userId) return;

    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      bill_id: billId,
      amount: billAmount(bill),
      date_iso: today,
    });

    if (error) {
      playError();
      showMsg(error.message, "err");
      return;
    }

    playCashRegister();
    showMsg("Payment recorded — the ledger is pleased.");
    await loadPayments(userId);
  }

  const currentMonthStart = currentMonthStartISO();

  const paidThisMonthByBill = useMemo(() => {
    const map: Record<string, number> = {};

    payments.forEach((p) => {
      if (!p.bill_id || p.date_iso < currentMonthStart) return;
      map[p.bill_id] = (map[p.bill_id] || 0) + clampMoney(p.amount);
    });

    return map;
  }, [payments, currentMonthStart]);

  const priorityItems = useMemo<PriorityInput[]>(() => {
    const billItems: PriorityInput[] = bills.map((b) => {
      const amtDue = billAmount(b);
      const paid = paidThisMonthByBill[b.id] || 0;

      return {
        id: b.id,
        type: "bill",
        name: b.name,
        amount: Math.max(0, amtDue - paid),
        due_date: b.due_date,
        due: b.due,
        due_day: b.due_day,
        category: b.category,
        kind: b.kind,
        focus: b.focus,
        is_paid_this_month: paid >= amtDue && amtDue > 0,
      };
    });

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
  }, [bills, debts, paidThisMonthByBill]);

  const rankedItems = useMemo(() => prioritizeMoneyItems(priorityItems), [priorityItems]);

  const totalBillsAmt = useMemo(() => addMoney(bills.map((b) => billAmount(b))), [bills]);
  const totalDebtMins = useMemo(() => addMoney(debts.map((d) => debtMin(d))), [debts]);
  const totalDebtBal = useMemo(() => addMoney(debts.map((d) => clampMoney(d.balance))), [debts]);

  const paidThisMonth = useMemo(
    () =>
      addMoney(
        payments
          .filter((p) => p.date_iso >= currentMonthStart)
          .map((p) => clampMoney(p.amount))
      ),
    [payments, currentMonthStart]
  );

  const remaining = Math.max(0, totalBillsAmt + totalDebtMins - paidThisMonth);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Post Office",
    totalNeeded: totalBillsAmt + totalDebtMins,
    incomeSoFar: paidThisMonth,
    incomeGap: remaining,
    dailyIncomeNeeded: Math.ceil(remaining / 30),
  });

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${POST_OFFICE_BG})` }}
      >
        <div
          style={{
            background: "rgba(15,8,4,0.9)",
            padding: "2rem 3rem",
            borderRadius: 12,
            border: "1px solid #6b4423",
          }}
        >
          <p className="font-cinzel text-lg" style={{ color: "#c9a84c" }}>
            Sorting the bills and debts…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        fontFamily: "EB Garamond, serif",
        backgroundImage: `url(${POST_OFFICE_BG})`,
      }}
    >
      <div
        className="min-h-screen pb-24"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,5,2,0.55), rgba(10,5,2,0.88))",
        }}
      >
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
          <div className="pt-4 pb-2 text-center">
            <p
              className="font-cinzel text-xs uppercase tracking-[0.35em]"
              style={{ color: "#d6a23a" }}
            >
              Franklin&apos;s Landing
            </p>

            <h1
              className="font-cinzel text-4xl font-bold"
              style={{
                color: "#f5e6c8",
                textShadow: "0 2px 18px rgba(0,0,0,0.9)",
              }}
            >
              Post Office of Bills & Debts
            </h1>

            <p className="mt-1 text-sm italic" style={{ color: "#d6c09a" }}>
              Letters, parcels, payments, accounts, receipts, and ledgers.
            </p>
          </div>

          <ColonialCard>
            <BenBubble message={ben.text} mood={ben.mood} />
          </ColonialCard>

          {message && (
            <div
              className="rounded-xl px-4 py-3 text-center font-cinzel text-sm tracking-wide"
              style={{
                background:
                  msgType === "err"
                    ? "rgba(248,113,113,0.08)"
                    : "rgba(201,168,76,0.08)",
                border: `1px solid ${
                  msgType === "err"
                    ? "rgba(248,113,113,0.3)"
                    : "rgba(201,168,76,0.3)"
                }`,
                color: msgType === "err" ? "#f87171" : "#c9a84c",
              }}
            >
              {msgType === "ok" ? "✦ " : "⚠ "}
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricTile icon="📋" label="Monthly Bills" value={money(totalBillsAmt)} />
            <MetricTile icon="💳" label="Debt Minimums" value={money(totalDebtMins)} />
            <MetricTile icon="✅" label="Paid This Month" value={money(paidThisMonth)} />
            <MetricTile icon="⚖️" label="Still Remaining" value={money(remaining)} />
          </div>

          {totalDebtBal > 0 && (
            <ColonialCard>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="font-cinzel text-xs uppercase tracking-widest"
                    style={{ color: "#9a7d5a" }}
                  >
                    Debts Remaining
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "#f87171" }}>
                    {money(totalDebtBal)}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className="font-cinzel text-xs uppercase tracking-widest"
                    style={{ color: "#9a7d5a" }}
                  >
                    Accounts Posted
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "#c9a84c" }}>
                    {debts.length}
                  </p>
                </div>
              </div>
            </ColonialCard>
          )}

          <ColonialCard>
            <h2
              className="mb-3 text-center font-cinzel text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#c9a84c" }}
            >
              Priority Board — {rankedItems.length} items
            </h2>

            {rankedItems.length === 0 ? (
              <p className="py-8 text-center text-sm italic" style={{ color: "#9a7d5a" }}>
                A rare and suspicious calm. Add your bills and debts below.
              </p>
            ) : (
              <div className="space-y-2">
                {rankedItems.map((r) => (
                  <ObligationItem
                    key={`${r.item.type}-${r.item.id}`}
                    result={r}
                    onPay={r.item.type === "bill" ? markBillPaid : undefined}
                    onDelete={
                      r.item.type === "bill"
                        ? () => deleteBill(r.item.id)
                        : () => deleteDebt(r.item.id)
                    }
                  />
                ))}
              </div>
            )}
          </ColonialCard>

          <ColonialCard>
            <div className="mb-4 flex gap-2">
              {(["bill", "debt"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAddTab(tab)}
                  className="flex-1 rounded-lg py-2 font-cinzel text-xs font-semibold uppercase tracking-widest transition"
                  style={{
                    background: addTab === tab ? "#c9a84c" : "rgba(107,68,35,0.2)",
                    color: addTab === tab ? "#1a0f0a" : "#9a7d5a",
                    border: "1px solid rgba(107,68,35,0.4)",
                  }}
                >
                  {tab === "bill" ? "📋 Add Bill" : "💳 Add Debt"}
                </button>
              ))}
            </div>

            {addTab === "bill" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <GoldLabel>Bill Name</GoldLabel>
                    <ParchmentInput
                      value={bName}
                      onChange={setBName}
                      placeholder="e.g. Electric bill"
                    />
                  </div>

                  <div>
                    <GoldLabel>Amount ($)</GoldLabel>
                    <ParchmentInput
                      type="number"
                      step="0.01"
                      value={bAmt}
                      onChange={setBAmt}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <GoldLabel>Category</GoldLabel>
                    <ParchmentSelect
                      value={bCat}
                      onChange={setBCat}
                      options={BILL_CATS.map((c) => ({
                        value: c,
                        label: c.charAt(0).toUpperCase() + c.slice(1),
                      }))}
                    />
                  </div>

                  <div>
                    <GoldLabel>Due Date</GoldLabel>
                    <ParchmentInput type="date" value={bDue} onChange={setBDue} />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bMo}
                    onChange={(e) => setBMo(e.target.checked)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span className="text-sm" style={{ color: "#e8d5b7" }}>
                    Repeats monthly
                  </span>
                </label>

                <button
                  onClick={addBill}
                  disabled={saving || !userId}
                  className="w-full rounded-lg py-2.5 font-cinzel text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
                  style={{
                    background: "#2d5a27",
                    color: "#f5e6c8",
                    border: "1px solid #4a8a42",
                  }}
                >
                  {saving ? "Recording…" : "+ Add Bill"}
                </button>
              </div>
            )}

            {addTab === "debt" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <GoldLabel>Debt Name</GoldLabel>
                    <ParchmentInput
                      value={dName}
                      onChange={setDName}
                      placeholder="e.g. Capital One"
                    />
                  </div>

                  <div>
                    <GoldLabel>Type</GoldLabel>
                    <ParchmentSelect
                      value={dKind}
                      onChange={(v) => setDKind(v as "credit" | "loan")}
                      options={[
                        { value: "credit", label: "💳 Credit Card" },
                        { value: "loan", label: "📄 Loan" },
                      ]}
                    />
                  </div>

                  <div>
                    <GoldLabel>Current Balance ($)</GoldLabel>
                    <ParchmentInput
                      type="number"
                      value={dBal}
                      onChange={setDBal}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <GoldLabel>Min. Payment ($)</GoldLabel>
                    <ParchmentInput
                      type="number"
                      value={dMin}
                      onChange={setDMin}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <GoldLabel>APR (%)</GoldLabel>
                    <ParchmentInput
                      type="number"
                      value={dApr}
                      onChange={setDApr}
                      placeholder="e.g. 24.99"
                    />
                  </div>

                  <div>
                    <GoldLabel>Credit Limit ($) — optional</GoldLabel>
                    <ParchmentInput
                      type="number"
                      value={dLimit}
                      onChange={setDLimit}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <GoldLabel>Due Date</GoldLabel>
                    <ParchmentInput type="date" value={dDue} onChange={setDDue} />
                  </div>
                </div>

                <button
                  onClick={addDebt}
                  disabled={saving || !userId}
                  className="w-full rounded-lg py-2.5 font-cinzel text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
                  style={{
                    background: "#6b4423",
                    color: "#f5e6c8",
                    border: "1px solid #c9a84c",
                  }}
                >
                  {saving ? "Recording…" : "+ Add Debt"}
                </button>
              </div>
            )}
          </ColonialCard>

          <div
            className="flex items-center gap-3 rounded-xl px-6 py-4"
            style={{
              background: "rgba(245,230,200,0.08)",
              border: "1px solid rgba(201,168,76,0.25)",
            }}
          >
            <span className="shrink-0 text-xl">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              “Creditors have better memories than debtors.” — Benjamin Franklin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
