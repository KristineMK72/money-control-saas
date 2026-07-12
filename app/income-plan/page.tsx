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

type ActiveTab = "bill" | "debt";

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
  credit_limit?: number | string | null;
  note?: string | null;
  is_monthly?: boolean | null;
};

type PaymentRow = {
  id: string;
  user_id?: string;
  amount: number | string | null;
  bill_id: string | null;
  debt_id?: string | null;
  date_iso: string;
  merchant?: string | null;
  note?: string | null;
  created_at?: string;
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

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDueDay(date: string) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).getDate();
}

export default function BillsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [activeTab, setActiveTab] = useState<ActiveTab>("bill");
  const [cardIndex, setCardIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [showBenNotice, setShowBenNotice] = useState(false);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

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
  const [dApr, setDApr] = useState("");

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);
    await Promise.all([
      loadBills(user.id),
      loadDebts(user.id),
      loadPayments(user.id),
    ]);

    setLoading(false);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", uid)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      showMsg(error.message);
      return;
    }

    setBills((data || []) as BillRow[]);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", uid)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      showMsg(error.message);
      return;
    }

    setDebts((data || []) as DebtRow[]);
  }

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false })
      .limit(100);

    if (error) {
      showMsg(error.message);
      return;
    }

    setPayments((data || []) as PaymentRow[]);
  }

  function showMsg(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  }

  function resetBillForm() {
    setEditingBillId(null);
    setBName("");
    setBAmt("");
    setBCat("household");
    setBDue("");
    setBMo(true);
  }

  function resetDebtForm() {
    setEditingDebtId(null);
    setDName("");
    setDBal("");
    setDMin("");
    setDKind("credit");
    setDDue("");
    setDApr("");
  }

  function openAdd() {
    resetBillForm();
    resetDebtForm();
    setShowAdd(true);
  }

  function editBill(bill: BillRow) {
    setActiveTab("bill");
    setEditingBillId(bill.id);
    setEditingDebtId(null);
    setBName(bill.name || "");
    setBAmt(String(billAmount(bill) || ""));
    setBCat(bill.category || "household");
    setBDue(bill.due_date || "");
    setBMo(Boolean(bill.is_monthly ?? true));
    setShowAdd(true);
    setShowRecent(false);
  }

  function editDebt(debt: DebtRow) {
    setActiveTab("debt");
    setEditingDebtId(debt.id);
    setEditingBillId(null);
    setDName(debt.name || "");
    setDBal(String(clampMoney(debt.balance) || ""));
    setDMin(String(debtMin(debt) || ""));
    setDKind(debt.kind || "credit");
    setDDue(debt.due_date || "");
    setDApr(String(clampMoney(debt.apr) || ""));
    setShowAdd(true);
    setShowRecent(false);
  }

  async function saveBill() {
    if (!userId) return;

    const amount = clampMoney(bAmt);

    if (!bName.trim() || amount <= 0) {
      playError();
      showMsg("Enter a bill name and amount.");
      return;
    }

    setSaving(true);

    const payload = {
      user_id: userId,
      name: bName.trim(),
      target: amount,
      monthly_target: bMo ? amount : null,
      category: bCat,
      due_date: bDue || null,
      due_day: getDueDay(bDue),
      is_monthly: bMo,
    };

    const { error } = editingBillId
      ? await supabase.from("bills").update(payload).eq("id", editingBillId).eq("user_id", userId)
      : await supabase.from("bills").insert(payload);

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playWrite();
    showMsg(editingBillId ? "Bill updated." : "Bill posted to the ledger.");
    resetBillForm();
    setShowAdd(false);
    await loadBills(userId);
  }

  async function saveDebt() {
    if (!userId) return;

    if (!dName.trim()) {
      playError();
      showMsg("Enter a debt name.");
      return;
    }

    setSaving(true);

    const min = clampMoney(dMin) || null;

    const payload = {
      user_id: userId,
      name: dName.trim(),
      kind: dKind,
      balance: clampMoney(dBal),
      min_payment: min,
      monthly_min_payment: min,
      due_date: dDue || null,
      due_day: getDueDay(dDue),
      apr: dApr ? clampMoney(dApr) : null,
      is_monthly: true,
    };

    const { error } = editingDebtId
      ? await supabase.from("debts").update(payload).eq("id", editingDebtId).eq("user_id", userId)
      : await supabase.from("debts").insert(payload);

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playCoins();
    showMsg(editingDebtId ? "Debt updated." : "Debt posted to the ledger.");
    resetDebtForm();
    setShowAdd(false);
    await loadDebts(userId);
  }

  async function deleteBill(id: string) {
    if (!userId) return;

    const ok = window.confirm("Delete this bill?");
    if (!ok) return;

    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playWrite();
    showMsg("Bill deleted.");
    setCardIndex(0);
    await loadBills(userId);
  }

  async function deleteDebt(id: string) {
    if (!userId) return;

    const ok = window.confirm("Delete this debt?");
    if (!ok) return;

    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playWrite();
    showMsg("Debt deleted.");
    setCardIndex(0);
    await loadDebts(userId);
  }

  async function markBillPaid(id: string) {
    if (!userId) return;

    const bill = bills.find((b) => b.id === id);
    if (!bill) return;

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      bill_id: id,
      debt_id: null,
      merchant: bill.name,
      amount: billAmount(bill),
      date_iso: isoToday(),
      note: "Marked paid from Post Office",
    });

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playCashRegister();
    showMsg("Bill payment recorded.");
    await loadPayments(userId);
  }

  async function markDebtPaid(id: string) {
    if (!userId) return;

    const debt = debts.find((d) => d.id === id);
    if (!debt) return;

    const amount = debtMin(debt);

    if (amount <= 0) {
      playError();
      showMsg("Add a minimum payment before marking this debt paid.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      bill_id: null,
      debt_id: id,
      merchant: debt.name,
      amount,
      date_iso: isoToday(),
      note: "Marked paid from Post Office",
    });

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playCashRegister();
    showMsg("Debt payment recorded.");
    await loadPayments(userId);
  }

  function goToPaymentPage() {
    if (!activeItem) {
      router.push("/payments");
      return;
    }

    const type = activeItem.item.type;
    const id = activeItem.item.id;

    router.push(`/payments?type=${type}&id=${id}`);
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
      is_paid_this_month: payments.some(
        (p) => p.bill_id === b.id && p.date_iso >= currentMonthStart
      ),
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
      is_paid_this_month: payments.some(
        (p) => p.debt_id === d.id && p.date_iso >= currentMonthStart
      ),
    }));

    return [...billItems, ...debtItems];
  }, [bills, debts, payments, currentMonthStart]);

  const rankedItems = useMemo(
    () => prioritizeMoneyItems(priorityItems),
    [priorityItems]
  );

  const roomItems = rankedItems.filter((r) => r.item.type === activeTab);
  const activeItem = roomItems[cardIndex] ?? null;

  const activeBill =
    activeItem?.item.type === "bill"
      ? bills.find((b) => b.id === activeItem.item.id) ?? null
      : null;

  const activeDebt =
    activeItem?.item.type === "debt"
      ? debts.find((d) => d.id === activeItem.item.id) ?? null
      : null;

  const activePayments = useMemo(() => {
    if (!activeItem) return [];

    return payments
      .filter((p) =>
        activeItem.item.type === "bill"
          ? p.bill_id === activeItem.item.id
          : p.debt_id === activeItem.item.id
      )
      .slice(0, 8);
  }, [payments, activeItem]);

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-cinzel text-[#c9a84c]">
          Opening the post office ledger…
        </p>
      </div>
    );
  }

  return (

    <main
      className="min-h-screen bg-black text-[#f5e6c8]"
      style={{ fontFamily: "EB Garamond, serif" }}
    >
      <section className="relative mx-auto max-w-5xl">
        <div
          className="px-4 py-3 text-center"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.98), rgba(15,8,4,.92))",
            borderBottom: "1px solid rgba(201,168,76,.25)",
          }}
        >
          <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-[#c9a84c]">
            Franklin&apos;s Landing
          </p>

          <h1 className="font-cinzel text-2xl font-bold tracking-wide text-[#f5e6c8] sm:text-4xl">
            Post Office of Debts & Bills
          </h1>
        </div>

        <img
          src={POST_OFFICE_BG}
          alt="Post Office of Debts and Bills"
          className="block h-auto w-full"
        />

        <button
          onClick={() => router.push("/world")}
          className="absolute left-4 top-20 rounded-full px-4 py-2 text-sm sm:top-24"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          ← Back to Town
        </button>

        <button
          onClick={() => setShowBenNotice(true)}
          className="absolute right-4 top-20 rounded-full px-4 py-2 text-sm sm:top-24"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          Ben&apos;s Notice
        </button>
      </section>

      <section className="relative z-10 mx-auto -mt-2 max-w-5xl px-4 pb-24 sm:-mt-8">
        <div
          className="rounded-3xl p-4 sm:p-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,5,3,.94), rgba(0,0,0,.99))",
            border: "1px solid rgba(201,168,76,.35)",
            boxShadow: "0 -30px 80px rgba(0,0,0,.9)",
          }}
        >
          <div className="mb-5 grid grid-cols-2 gap-3">
            {(["bill", "debt"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCardIndex(0);
                  setShowAdd(false);
                  setShowRecent(false);
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

          <div className="mb-4 grid grid-cols-[56px_1fr_56px] items-center gap-2 sm:grid-cols-[72px_1fr_72px] sm:gap-4">
            <button
              onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
              className="h-14 rounded-full font-cinzel sm:h-16"
              style={{ border: "1px solid rgba(201,168,76,.45)" }}
            >
              ◀
            </button>

            <div
              className="min-h-[270px] rounded-2xl p-5 text-center"
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

                  {activeTab === "debt" && activeDebt && (
                    <p className="mt-3 text-sm text-[#d6c09a]">
                      Balance: {money(clampMoney(activeDebt.balance))}
                      {activeDebt.apr ? ` • APR: ${activeDebt.apr}%` : ""}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      onClick={() =>
                        activeTab === "bill" && activeBill
                          ? markBillPaid(activeBill.id)
                          : activeDebt
                            ? markDebtPaid(activeDebt.id)
                            : null
                      }
                      className="rounded-xl px-3 py-2 text-sm font-bold"
                      style={{
                        background: "#166534",
                        border: "1px solid #4ade80",
                      }}
                    >
                      Mark Paid
                    </button>

                    <button
                      onClick={goToPaymentPage}
                      className="rounded-xl px-3 py-2 text-sm font-bold"
                      style={{
                        background: "rgba(201,168,76,.18)",
                        border: "1px solid rgba(201,168,76,.55)",
                      }}
                    >
                      Pay Page
                    </button>

                    <button
                      onClick={() =>
                        activeTab === "bill" && activeBill
                          ? editBill(activeBill)
                          : activeDebt
                            ? editDebt(activeDebt)
                            : null
                      }
                      className="rounded-xl px-3 py-2 text-sm font-bold"
                      style={{
                        background: "rgba(59,130,246,.22)",
                        border: "1px solid rgba(147,197,253,.65)",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => setShowRecent((v) => !v)}
                      className="rounded-xl px-3 py-2 text-sm font-bold"
                      style={{
                        background: "rgba(0,0,0,.35)",
                        border: "1px solid rgba(201,168,76,.45)",
                      }}
                    >
                      Payments
                    </button>
                  </div>
                </>
              ) : (
                <p className="pt-20 text-[#9a7d5a]">
                  No {activeTab === "bill" ? "bills" : "debts"} posted yet.
                </p>
              )}
            </div>

            <button
              onClick={() =>
                setCardIndex((i) =>
                  Math.min(Math.max(roomItems.length - 1, 0), i + 1)
                )
              }
              className="h-14 rounded-full font-cinzel sm:h-16"
              style={{ border: "1px solid rgba(201,168,76,.45)" }}
            >
              ▶
            </button>
          </div>

          <div className="mb-6 flex justify-center gap-2">
            {roomItems.slice(0, 8).map((_, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full"
                style={{
                  background: i === cardIndex ? "#c9a84c" : "#5f5748",
                }}
              />
            ))}
          </div>

          {showRecent && activeItem && (
            <div
              className="mb-6 rounded-2xl p-4"
              style={{
                background: "rgba(15,8,4,.9)",
                border: "1px solid rgba(201,168,76,.35)",
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-cinzel text-xl font-bold text-[#c9a84c]">
                  Recent Payments
                </h3>

                <button
                  onClick={() => router.push("/payments")}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: "1px solid rgba(201,168,76,.45)",
                  }}
                >
                  View All
                </button>
              </div>

              {activePayments.length ? (
                <div className="grid gap-2">
                  {activePayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl px-3 py-2"
                      style={{
                        background: "rgba(0,0,0,.45)",
                        border: "1px solid rgba(201,168,76,.2)",
                      }}
                    >
                      <div>
                        <p className="font-bold">{p.date_iso}</p>
                        <p className="text-sm text-[#d6c09a]">
                          {p.note || p.merchant || "Payment recorded"}
                        </p>
                      </div>

                      <p className="font-bold text-[#4ade80]">
                        {money(clampMoney(p.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#d6c09a]">
                  No payments recorded for this{" "}
                  {activeTab === "bill" ? "bill" : "debt"} yet.
                </p>
              )}
            </div>
          )}

          <div
            className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-4"
            style={{
              border: "1px solid rgba(201,168,76,.4)",
              background: "rgba(0,0,0,.58)",
            }}
          >
            <Metric
              icon="🪙"
              label="This Month Paid"
              value={money(paidThisMonth)}
              color="#4ade80"
            />
            <Metric icon="📋" label="Total Due" value={money(totalDue)} />
            <Metric
              icon="⏳"
              label="Overdue"
              value={money(overdue)}
              color="#ef4444"
            />
            <Metric icon="📅" label="Due Soon" value={money(dueSoon)} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <button
              onClick={goToPaymentPage}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}
            >
              ✍️ Make Payment
            </button>

            <button
              onClick={openAdd}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{
                background: "#166534",
                border: "1px solid #4ade80",
              }}
            >
              + Add {activeTab === "bill" ? "Bill" : "Debt"}
            </button>

            <button
              onClick={() => setShowRecent((v) => !v)}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}
            >
              🧾 Recent Payments
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
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-cinzel text-xl font-bold text-[#c9a84c]">
                  {activeTab === "bill"
                    ? editingBillId
                      ? "Edit Bill"
                      : "Add Bill"
                    : editingDebtId
                      ? "Edit Debt"
                      : "Add Debt"}
                </h3>

                <button
                  onClick={() => {
                    setShowAdd(false);
                    resetBillForm();
                    resetDebtForm();
                  }}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ border: "1px solid rgba(201,168,76,.45)" }}
                >
                  Cancel
                </button>
              </div>

              {activeTab === "bill" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Bill Name" value={bName} onChange={setBName} />
                  <Input
                    label="Amount"
                    value={bAmt}
                    onChange={setBAmt}
                    type="number"
                  />
                  <Select
                    label="Category"
                    value={bCat}
                    onChange={setBCat}
                    options={BILL_CATS}
                  />
                  <Input
                    label="Due Date"
                    value={bDue}
                    onChange={setBDue}
                    type="date"
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={bMo}
                      onChange={(e) => setBMo(e.target.checked)}
                    />
                    Repeats monthly
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={saveBill}
                      disabled={saving}
                      className="rounded-xl bg-green-800 py-3 font-bold disabled:opacity-50"
                    >
                      {editingBillId ? "Update Bill" : "Save Bill"}
                    </button>

                    {editingBillId && (
                      <button
                        onClick={() => deleteBill(editingBillId)}
                        disabled={saving}
                        className="rounded-xl bg-red-900 py-3 font-bold disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Debt Name" value={dName} onChange={setDName} />
                  <Input
                    label="Balance"
                    value={dBal}
                    onChange={setDBal}
                    type="number"
                  />
                  <Input
                    label="Minimum Payment"
                    value={dMin}
                    onChange={setDMin}
                    type="number"
                  />
                  <Input
                    label="APR"
                    value={dApr}
                    onChange={setDApr}
                    type="number"
                  />
                  <Input
                    label="Due Date"
                    value={dDue}
                    onChange={setDDue}
                    type="date"
                  />
                  <Select
                    label="Type"
                    value={dKind}
                    onChange={(v) => setDKind(v as "credit" | "loan")}
                    options={["credit", "loan"]}
                  />

                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                    <button
                      onClick={saveDebt}
                      disabled={saving}
                      className="rounded-xl bg-green-800 py-3 font-bold disabled:opacity-50"
                    >
                      {editingDebtId ? "Update Debt" : "Save Debt"}
                    </button>

                    {editingDebtId && (
                      <button
                        onClick={() => deleteDebt(editingDebtId)}
                        disabled={saving}
                        className="rounded-xl bg-red-900 py-3 font-bold disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
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

      {showBenNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
          <div
            className="max-w-md rounded-3xl p-5"
            style={{
              background: "#fff7df",
              border: "2px solid #c9a84c",
              color: "#1a0f0a",
              boxShadow: "0 30px 80px rgba(0,0,0,.7)",
            }}
          >
            <div className="flex gap-3">
              <img
                src="/ben.png"
                alt="Ben"
                className="h-16 w-16 rounded-xl border border-[#c9a84c] object-cover"
              />

              <div>
                <p className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#8a3a12]">
                  Ben&apos;s Almanack
                </p>

                <p className="mt-2 text-lg font-bold leading-snug">
                  Ben says: I see {bills.length} bills and {debts.length} debts
                  in the colony. Keeping due dates visible prevents ambushes.
                </p>

                <p className="mt-3 text-sm">{ben.text}</p>
              </div>
            </div>

            <button
              onClick={() => setShowBenNotice(false)}
              className="mt-5 w-full rounded-xl py-3 font-bold"
              style={{
                background: "#1a0f0a",
                color: "#f5e6c8",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
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
    <div className="border-b border-[#c9a84c]/20 p-4 text-center last:border-r-0 sm:border-b-0 sm:border-r">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-xs uppercase tracking-widest text-[#d6c09a]">
        {label}
      </p>
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
      <span className="text-xs uppercase tracking-widest text-[#c9a84c]">
        {label}
      </span>
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
      <span className="text-xs uppercase tracking-widest text-[#c9a84c]">
        {label}
      </span>
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
