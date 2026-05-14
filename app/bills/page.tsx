"use client";

import { useEffect, useMemo, useState } from "react";
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

const shellClass =
  "rounded-[2rem] border border-white/25 bg-slate-950/45 p-4 shadow-2xl backdrop-blur-sm md:p-6";

const cardClass =
  "rounded-2xl border border-white/45 bg-white/78 p-5 shadow-xl backdrop-blur-md";

const inputClass =
  "mt-2 w-full rounded-xl border border-zinc-300 bg-white/95 px-3 py-2 text-zinc-950 outline-none focus:border-emerald-500";

export default function BillsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openPanel, setOpenPanel] = useState<string | null>("summary");

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.session?.user;

    if (!user) {
      setMessage("Please log in.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadBills(user.id),
      loadPayments(user.id),
    ]);

    setLoading(false);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select(
        "id, user_id, name, target, category, due_date, due_day, created_at"
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((data as BillRow[]) || []);
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

    setPayments((data as PaymentRow[]) || []);
  }

  async function scanBillImage(file: File | null) {
    if (!file) return;

    setScanning(true);
    setMessage("Scanning image...");

    try {
      const ocrResult = await ocrImageFile(file);

      const parsed = parseTransactionsScreenshot(
        ocrResult.text
      );

      const first = parsed?.[0];

      if (!first) {
        setMessage(
          "Scanner could not find a bill or transaction. You can still enter it manually."
        );

        setScanning(false);
        return;
      }

      const merchant = String(first.merchant || "").trim();

      const parsedAmount = Number(first.amount || 0);

      if (merchant) {
        setName(merchant);
      }

      if (
        Number.isFinite(parsedAmount) &&
        parsedAmount > 0
      ) {
        setAmount(String(parsedAmount));
      }

      setOpenPanel("add");

      setMessage(
        "Scanner filled what it could. Check it, then tap Add Bill."
      );
    } catch (error) {
      console.error("Bill scanner error:", error);

      setMessage(
        "Scanner had trouble reading that image. Try another photo or enter it manually."
      );
    }

    setScanning(false);
  }

  async function addBill() {
    if (!userId) return;

    const amt = Number(amount);

    if (
      !name.trim() ||
      !Number.isFinite(amt) ||
      amt <= 0
    ) {
      setMessage(
        "Invalid bill. Add a name and amount above $0."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("bills")
      .insert({
        user_id: userId,
        name: name.trim(),
        target: amt,
        category,
        due_date: dueDate || null,
        due_day: null,
      });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setAmount("");
    setDueDate("");
    setCategory("other");

    await loadBills(userId);

    setSaving(false);
    setOpenPanel("summary");

    setMessage("Bill added.");
  }

  async function payBill(bill: BillRow) {
    if (!userId) {
      setMessage("Not logged in.");
      return;
    }

    const amt = Number(payAmount);

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const { error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        date_iso: new Date()
          .toISOString()
          .slice(0, 10),
        amount: amt,
        merchant: bill.name,
        note: "Bill payment",
        bill_id: bill.id,
        debt_id: null,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Paid ${bill.name}.`);

    setPayingId(null);
    setPayAmount("");

    await Promise.all([
      loadPayments(userId),
      loadBills(userId),
    ]);
  }

  async function deleteBill(id: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this bill?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((prev) =>
      prev.filter((b) => b.id !== id)
    );

    setMessage("Bill deleted.");
  }

  const totalBills = useMemo(() => {
    return bills.reduce(
      (sum, bill) =>
        sum + Number(bill.target || 0),
      0
    );
  }, [bills]);

  const totalPaidThisMonth = useMemo(() => {
    return payments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );
  }, [payments]);

  function getMonthlyPaid(billId: string) {
    const month = new Date()
      .toISOString()
      .slice(0, 7);

    return payments
      .filter(
        (payment) =>
          payment.bill_id === billId &&
          Boolean(payment.date_iso) &&
          payment.date_iso.startsWith(month)
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-4 md:p-6">
        <div className={`${shellClass} mx-auto max-w-5xl`}>
          <div className={cardClass}>
            Loading bills...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div
        className={`${shellClass} mx-auto max-w-5xl space-y-5`}
      >
        <header className={cardClass}>
          <div className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
            AskBen Bills
          </div>

          <h1 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">
            Bills
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-700">
            Keep bills organized without covering up
            the whole BenWorld background.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniStat
              label="Total Bills"
              value={money(totalBills)}
            />

            <MiniStat
              label="Bill Count"
              value={String(bills.length)}
            />

            <MiniStat
              label="Paid This Month"
              value={money(totalPaidThisMonth)}
            />
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-sm font-semibold text-amber-900">
              {message}
            </div>
          )}
        </header>

        <DropdownCard
          id="scanner"
          title="Scan a bill or receipt"
          value={
            scanning
              ? "Scanning..."
              : "Use camera/photo"
          }
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
        >
          <p className="text-sm font-semibold text-zinc-700">
            Upload a bill screenshot or receipt
            image. AskBen will try to fill in the
            name and amount for you.
          </p>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={scanning}
            onChange={(e) =>
              void scanBillImage(
                e.target.files?.[0] || null
              )
            }
            className="mt-4 block w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50/80 p-4 text-sm font-bold text-emerald-900"
          />
        </DropdownCard>

        <DropdownCard
          id="add"
          title="Add Bill"
          value={
            name || amount
              ? "Draft ready"
              : "Manual entry"
          }
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-zinc-700">
              Name

              <input
                placeholder="Rent, Electric, Phone..."
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Amount

              <input
                inputMode="decimal"
                placeholder="125.00"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Due Date

              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Category

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className={inputClass}
              >
                <option value="housing">
                  Housing
                </option>

                <option value="utilities">
                  Utilities
                </option>

                <option value="transportation">
                  Transportation
                </option>

                <option value="debt">
                  Debt
                </option>

                <option value="food">
                  Food
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </label>
          </div>

          <button
            onClick={addBill}
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add Bill"}
          </button>
        </DropdownCard>

        <section className="space-y-3">
          {bills.length === 0 ? (
            <div className={cardClass}>
              No bills yet. Add your first bill
              above.
            </div>
          ) : (
            bills.map((bill) => {
              const paid = getMonthlyPaid(
                bill.id
              );

              const target = Number(
                bill.target || 0
              );

              const pct =
                target > 0
                  ? Math.min(
                      (paid / target) * 100,
                      100
                    )
                  : 0;

              return (
                <DropdownCard
                  key={bill.id}
                  id={`bill-${bill.id}`}
                  title={bill.name}
                  value={money(target)}
                  openPanel={openPanel}
                  setOpenPanel={setOpenPanel}
                >
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <MiniStat
                        label="Target"
                        value={money(target)}
                      />

                      <MiniStat
                        label="Paid"
                        value={money(paid)}
                      />

                      <MiniStat
                        label="Remaining"
                        value={money(
                          Math.max(
                            0,
                            target - paid
                          )
                        )}
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-xs font-bold text-zinc-700">
                        <span>
                          {money(paid)} /{" "}
                          {money(target)} paid
                          this month
                        </span>

                        <span>
                          {pct.toFixed(0)}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${pct}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {payingId === bill.id ? (
                        <>
                          <input
                            inputMode="decimal"
                            placeholder="Amount"
                            value={payAmount}
                            onChange={(e) =>
                              setPayAmount(
                                e.target.value
                              )
                            }
                            className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-emerald-500"
                          />

                          <button
                            onClick={() =>
                              void payBill(
                                bill
                              )
                            }
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white"
                          >
                            Confirm
                          </button>

                          <button
                            onClick={() => {
                              setPayingId(
                                null
                              );

                              setPayAmount(
                                ""
                              );
                            }}
                            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-black text-zinc-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setPayingId(
                              bill.id
                            );

                            setPayAmount(
                              ""
                            );
                          }}
                          className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-black text-white"
                        >
                          Pay Bill
                        </button>
                      )}

                      <button
                        onClick={() =>
                          void deleteBill(
                            bill.id
                          )
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </DropdownCard>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function DropdownCard({
  id,
  title,
  value,
  openPanel,
  setOpenPanel,
  children,
}: {
  id: string;
  title: string;
  value: string;
  openPanel: string | null;
  setOpenPanel: (
    id: string | null
  ) => void;
  children: React.ReactNode;
}) {
  const open = openPanel === id;

  return (
    <article className={cardClass}>
      <button
        type="button"
        onClick={() =>
          setOpenPanel(open ? null : id)
        }
        className="w-full text-left"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-700">
              {title}
            </h2>

            <p className="mt-1 text-2xl font-black text-zinc-950">
              {value}
            </p>
          </div>

          <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
            {open ? "Hide" : "Open"}
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/82 p-4 backdrop-blur-md">
          {children}
        </div>
      )}
    </article>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-xs font-black uppercase tracking-wide text-zinc-600">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-zinc-950">
        {value}
      </div>
    </div>
  );
}
