"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";

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

type EditDebt = {
  name: string;
  balance: string;
  minPayment: string;
  apr: string;
  kind: "credit" | "loan";
  dueDate: string;
  dueDay: string;
  creditLimit: string;
  note: string;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return num(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function percent(value: unknown) {
  const n = num(value);
  if (n <= 0) return "APR not added";
  return `${n.toFixed(2)}% APR`;
}

function formatDate(value: string | null, dueDay?: number | null) {
  if (value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (dueDay) return `Day ${dueDay} monthly`;

  return "No due date";
}

const shellClass =
  "rounded-2xl border border-white/40 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl md:p-8";

const cardClass =
  "rounded-2xl border border-white/80 bg-white p-5 text-zinc-950 shadow-2xl shadow-zinc-950/10 md:p-6";

const inputClass =
  "rounded-2xl border border-zinc-300 bg-white px-5 py-3.5 text-zinc-950 shadow-sm outline-none placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const smallButtonClass =
  "rounded-xl px-4 py-2 text-sm font-black transition";

export default function DebtPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [apr, setApr] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"credit" | "loan">("credit");
  const [dueDate, setDueDate] = useState("");
  const [dueDay, setDueDay] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDebt, setEditDebt] = useState<EditDebt | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);
    setMessage("");

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
      setMessage("Please log in to view your debt.");
      setLoading(false);
      return;
    }

    setUserId(user.id);
    await loadDebts(user.id);
    setLoading(false);
  }

  async function loadDebts(uid: string) {
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setDebts([]);
      return;
    }

    setDebts((data || []) as DebtRow[]);
  }

  async function scanDebtImage(file: File | null) {
    if (!file) return;

    setScanning(true);
    setMessage("");

    try {
      const { text } = await ocrImageFile(file);
      const parsed = parseTransactionsScreenshot(text);
      const first = parsed?.[0];

      if (first) {
        setName(first.merchant || "");

        if (num(first.amount) > 0) {
          setBalance(String(first.amount));
        }

        setMessage("Ben auto-filled what he could. Review APR, minimum, and due date.");
      } else {
        setMessage("Ben could not find debt details. You can still enter manually.");
      }
    } catch {
      setMessage("Scanner had trouble. You can still enter manually.");
    }

    setScanning(false);
  }

  async function addDebt() {
    if (!userId || saving) return;

    const bal = num(balance);
    const min = num(minPayment);
    const aprValue = num(apr);
    const limit = num(creditLimit);
    const day = num(dueDay);

    if (!name.trim() || bal <= 0) {
      setMessage("Name and valid balance required.");
      return;
    }

    if (day > 31) {
      setMessage("Due day must be between 1 and 31.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name: name.trim(),
      kind,
      balance: bal,
      min_payment: min > 0 ? min : null,
      monthly_min_payment: min > 0 ? min : null,
      apr: aprValue > 0 ? aprValue : null,
      credit_limit: limit > 0 ? limit : null,
      note: note.trim() || null,
      due_date: dueDate || null,
      is_monthly: true,
      due_day:
        day > 0
          ? day
          : dueDate
          ? new Date(`${dueDate}T00:00:00`).getDate()
          : null,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Debt added successfully.");
    setName("");
    setBalance("");
    setMinPayment("");
    setApr("");
    setCreditLimit("");
    setNote("");
    setDueDate("");
    setDueDay("");

    await loadDebts(userId);
  }

  function startEdit(debt: DebtRow) {
    setEditingId(debt.id);
    setEditDebt({
      name: debt.name || "",
      balance: String(debt.balance ?? ""),
      minPayment: String(debt.monthly_min_payment ?? debt.min_payment ?? ""),
      apr: String(debt.apr ?? ""),
      kind: debt.kind,
      dueDate: debt.due_date || "",
      dueDay: String(debt.due_day ?? ""),
      creditLimit: String(debt.credit_limit ?? ""),
      note: debt.note || "",
    });
  }

  async function saveEdit(id: string) {
    if (!userId || !editDebt || saving) return;

    const bal = num(editDebt.balance);
    const min = num(editDebt.minPayment);
    const aprValue = num(editDebt.apr);
    const limit = num(editDebt.creditLimit);
    const day = num(editDebt.dueDay);

    if (!editDebt.name.trim() || bal <= 0) {
      setMessage("Name and valid balance required.");
      return;
    }

    if (day > 31) {
      setMessage("Due day must be between 1 and 31.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("debts")
      .update({
        name: editDebt.name.trim(),
        kind: editDebt.kind,
        balance: bal,
        min_payment: min > 0 ? min : null,
        monthly_min_payment: min > 0 ? min : null,
        apr: aprValue > 0 ? aprValue : null,
        credit_limit: limit > 0 ? limit : null,
        note: editDebt.note.trim() || null,
        due_date: editDebt.dueDate || null,
        due_day:
          day > 0
            ? day
            : editDebt.dueDate
            ? new Date(`${editDebt.dueDate}T00:00:00`).getDate()
            : null,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    setSaving(false);

    if (error) {
      setMessage(`Could not save changes: ${error.message}`);
      return;
    }

    setMessage("Debt updated.");
    setEditingId(null);
    setEditDebt(null);
    await loadDebts(userId);
  }

  async function deleteDebt(id: string) {
    if (!userId) return;

    const confirmed = window.confirm("Delete this debt?");
    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(`Could not delete debt: ${error.message}`);
      return;
    }

    setMessage("Debt deleted.");
    await loadDebts(userId);
  }

  const totals = useMemo(() => {
    const totalBalance = debts.reduce((sum, debt) => sum + num(debt.balance), 0);

    const totalMin = debts.reduce(
      (sum, debt) => sum + num(debt.monthly_min_payment ?? debt.min_payment),
      0
    );

    const weightedApr =
      totalBalance > 0
        ? debts.reduce((sum, debt) => {
            return sum + num(debt.balance) * num(debt.apr);
          }, 0) / totalBalance
        : 0;

    return {
      totalBalance,
      totalMin,
      accountCount: debts.length,
      weightedApr,
    };
  }, [debts]);

  const avalancheOrder = useMemo(() => {
    return [...debts]
      .filter((debt) => num(debt.balance) > 0)
      .sort((a, b) => num(b.apr) - num(a.apr));
  }, [debts]);

  const snowballOrder = useMemo(() => {
    return [...debts]
      .filter((debt) => num(debt.balance) > 0)
      .sort((a, b) => num(a.balance) - num(b.balance));
  }, [debts]);

  const highestAprDebt = avalancheOrder[0];
  const smallestDebt = snowballOrder[0];

  const customInsight = useMemo(() => {
    if (debts.length === 0) {
      return "Add a debt and Ben will build a payoff strategy. Avalanche attacks interest. Snowball attacks momentum. Both beat ignoring it like it owes thee money.";
    }

    if (highestAprDebt && num(highestAprDebt.apr) > 0) {
      return `Avalanche move: attack ${highestAprDebt.name} first at ${percent(
        highestAprDebt.apr
      )}. Pay minimums on everything else, then throw extra cash at that balance.`;
    }

    if (smallestDebt) {
      return `Snowball move: start with ${smallestDebt.name}, your smallest balance at ${money(
        smallestDebt.balance
      )}. Knock it out first for a quick win.`;
    }

    return "Ben needs APRs and balances to build a sharper payoff plan.";
  }, [debts, highestAprDebt, smallestDebt]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Debt Overview",
    totalNeeded: totals.totalMin,
    incomeSoFar: 0,
    incomeGap: totals.totalMin,
    dailyIncomeNeeded: Math.ceil(totals.totalMin / 30),
  });

  if (loading) {
    return <div className="p-8 text-center text-white">Loading debts...</div>;
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-6xl space-y-8`}>
        <header>
          <h1 className="text-4xl font-black text-white md:text-5xl">Debt</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold text-white/95 md:text-lg">
            Track what you owe, see APR clearly, and pick a payoff strategy that
            actually makes sense.
          </p>
        </header>

        {message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950 shadow-xl">
            {message}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/20 bg-slate-950 p-6 shadow-xl">
          <BenBubble
            message={`${benInsight.text} ${customInsight}`}
            mood={benInsight.mood}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Debt" value={totals.totalBalance} />
          <StatCard label="Monthly Minimums" value={totals.totalMin} />
          <StatCard
            label="Avg APR"
            value={
              totals.weightedApr > 0
                ? `${totals.weightedApr.toFixed(2)}%`
                : "Add APR"
            }
            plain
          />
          <StatCard label="Accounts" value={totals.accountCount} plain />
        </div>

        <section className={cardClass}>
          <h2 className="text-2xl font-black">Ben Payoff Strategy</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <StrategyCard
              title="Avalanche"
              subtitle="Best for saving interest"
              debt={highestAprDebt}
              detail={
                highestAprDebt
                  ? `${highestAprDebt.name} has the highest APR: ${percent(
                      highestAprDebt.apr
                    )}.`
                  : "Add APRs to unlock this strategy."
              }
            />

            <StrategyCard
              title="Snowball"
              subtitle="Best for motivation"
              debt={smallestDebt}
              detail={
                smallestDebt
                  ? `${smallestDebt.name} is the smallest balance: ${money(
                      smallestDebt.balance
                    )}.`
                  : "Add debts to unlock this strategy."
              }
            />
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-6 flex items-start gap-4">
            <div className="text-5xl">📜</div>
            <div>
              <h2 className="text-2xl font-black">Scan Debt Statement</h2>
              <p className="text-sm font-semibold text-zinc-700">
                Upload a credit card statement, loan summary, or screenshot.
              </p>
            </div>
          </div>

          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center shadow-inner transition hover:bg-amber-100">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />

            <div className="mx-auto mb-4 text-7xl">📜</div>

            <p className="break-words text-xl font-black text-amber-950">
              {imageFile
                ? imageFile.name
                : "Tap to upload statement or screenshot"}
            </p>
          </label>

          <button
            onClick={() => void scanDebtImage(imageFile)}
            disabled={!imageFile || scanning}
            className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan with Ben"}
          </button>
        </section>

        <section className={cardClass}>
          <h2 className="mb-6 text-2xl font-black">Add New Debt</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Debt name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />

            <input
              placeholder="Current balance"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className={inputClass}
            />

            <input
              placeholder="Monthly minimum"
              inputMode="decimal"
              value={minPayment}
              onChange={(e) => setMinPayment(e.target.value)}
              className={inputClass}
            />

            <input
              placeholder="APR, example: 27.99"
              inputMode="decimal"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              className={inputClass}
            />

            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "credit" | "loan")}
              className={inputClass}
            >
              <option value="credit">Credit Card</option>
              <option value="loan">Loan</option>
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                const value = e.target.value;
                setDueDate(value);
                if (value) {
                  setDueDay(String(new Date(`${value}T00:00:00`).getDate()));
                }
              }}
              className={inputClass}
            />

            <input
              placeholder="Due day, example: 15"
              inputMode="numeric"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className={inputClass}
            />

            <input
              placeholder="Credit limit optional"
              inputMode="decimal"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className={inputClass}
            />

            <input
              placeholder="Note optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputClass} md:col-span-2`}
            />
          </div>

          <button
            onClick={() => void addDebt()}
            disabled={saving}
            className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-black text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Debt"}
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white">Your Debts</h2>

          {debts.length === 0 ? (
            <div className={cardClass}>
              <p className="font-bold text-zinc-700">
                No debts added yet. Add one above and Ben will build your payoff
                plan.
              </p>
            </div>
          ) : (
            debts.map((debt) => {
              const isEditing = editingId === debt.id && editDebt;

              return (
                <div key={debt.id} className={cardClass}>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-black uppercase tracking-widest text-emerald-800">
                          Editing Debt
                        </p>
                        <p className="mt-1 text-sm font-bold text-emerald-950">
                          Change the fields below, then tap Save Changes.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          value={editDebt.name}
                          onChange={(e) =>
                            setEditDebt({ ...editDebt, name: e.target.value })
                          }
                          className={inputClass}
                        />

                        <input
                          value={editDebt.balance}
                          inputMode="decimal"
                          onChange={(e) =>
                            setEditDebt({
                              ...editDebt,
                              balance: e.target.value,
                            })
                          }
                          className={inputClass}
                        />

                        <input
                          value={editDebt.minPayment}
                          inputMode="decimal"
                          onChange={(e) =>
                            setEditDebt({
                              ...editDebt,
                              minPayment: e.target.value,
                            })
                          }
                          className={inputClass}
                        />

                        <input
                          value={editDebt.apr}
                          inputMode="decimal"
                          placeholder="APR"
                          onChange={(e) =>
                            setEditDebt({ ...editDebt, apr: e.target.value })
                          }
                          className={inputClass}
                        />

                        <select
                          value={editDebt.kind}
                          onChange={(e) =>
                            setEditDebt({
                              ...editDebt,
                              kind: e.target.value as "credit" | "loan",
                            })
                          }
                          className={inputClass}
                        >
                          <option value="credit">Credit Card</option>
                          <option value="loan">Loan</option>
                        </select>

                        <input
                          type="date"
                          value={editDebt.dueDate}
                          onChange={(e) => {
                            const value = e.target.value;

                            setEditDebt({
                              ...editDebt,
                              dueDate: value,
                              dueDay: value
                                ? String(
                                    new Date(`${value}T00:00:00`).getDate()
                                  )
                                : editDebt.dueDay,
                            });
                          }}
                          className={inputClass}
                        />

                        <input
                          value={editDebt.dueDay}
                          inputMode="numeric"
                          placeholder="Due day, example: 15"
                          onChange={(e) =>
                            setEditDebt({
                              ...editDebt,
                              dueDay: e.target.value,
                            })
                          }
                          className={inputClass}
                        />

                        <input
                          value={editDebt.creditLimit}
                          inputMode="decimal"
                          placeholder="Credit limit"
                          onChange={(e) =>
                            setEditDebt({
                              ...editDebt,
                              creditLimit: e.target.value,
                            })
                          }
                          className={inputClass}
                        />

                        <input
                          value={editDebt.note}
                          placeholder="Note"
                          onChange={(e) =>
                            setEditDebt({ ...editDebt, note: e.target.value })
                          }
                          className={`${inputClass} md:col-span-2`}
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => void saveEdit(debt.id)}
                          disabled={saving}
                          className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditDebt(null);
                          }}
                          className="rounded-2xl bg-zinc-200 px-6 py-3 font-black text-zinc-950 hover:bg-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between gap-5 md:flex-row">
                      <div>
                        <h3 className="text-2xl font-black text-zinc-950">
                          {debt.name}
                        </h3>

                        <p className="mt-1 text-sm font-bold capitalize text-zinc-600">
                          {debt.kind} • Due{" "}
                          {formatDate(debt.due_date, debt.due_day)}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <MiniStat
                            label="Minimum"
                            value={money(
                              debt.monthly_min_payment ?? debt.min_payment
                            )}
                          />
                          <MiniStat label="APR" value={percent(debt.apr)} />
                          <MiniStat
                            label="Credit limit"
                            value={
                              num(debt.credit_limit) > 0
                                ? money(debt.credit_limit)
                                : "Not added"
                            }
                          />
                        </div>

                        {debt.note ? (
                          <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-700">
                            {debt.note}
                          </p>
                        ) : null}
                      </div>

                      <div className="md:text-right">
                        <p className="text-sm font-black uppercase tracking-widest text-zinc-500">
                          Balance
                        </p>
                        <p className="text-3xl font-black text-zinc-950">
                          {money(debt.balance)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                          <button
                            onClick={() => startEdit(debt)}
                            className={`${smallButtonClass} bg-sky-100 text-sky-900 hover:bg-sky-200`}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => void deleteDebt(debt.id)}
                            className={`${smallButtonClass} bg-rose-100 text-rose-900 hover:bg-rose-200`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  plain = false,
}: {
  label: string;
  value: number | string;
  plain?: boolean;
}) {
  return (
    <div className={cardClass}>
      <div className="text-sm font-black uppercase tracking-widest text-zinc-600">
        {label}
      </div>

      <div className="mt-3 break-words text-3xl font-black text-zinc-950 md:text-4xl">
        {plain ? value : money(value)}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function StrategyCard({
  title,
  subtitle,
  detail,
  debt,
}: {
  title: string;
  subtitle: string;
  detail: string;
  debt?: DebtRow;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {subtitle}
      </p>
      <h3 className="mt-1 text-xl font-black text-zinc-950">{title}</h3>
      <p className="mt-3 text-sm font-bold leading-6 text-zinc-700">{detail}</p>

      {debt ? (
        <div className="mt-4 rounded-xl bg-white p-3">
          <p className="font-black text-zinc-950">{debt.name}</p>
          <p className="text-sm font-bold text-zinc-600">
            {money(debt.balance)} balance • {percent(debt.apr)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
