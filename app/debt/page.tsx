"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";
import { clampMoney, money } from "@/lib/money/math";
import { daysUntil, nextDateFromDueDay } from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";

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

type ScanReview = {
  name: string;
  balance: string;
  minPayment: string;
  dueDay: string;
  dueDate: string;
  note: string;
};

function cleanNumberString(value: string) {
  return value.replace(/[$,%\s,]/g, "");
}

function num(value: unknown) {
  const raw = typeof value === "string" ? cleanNumberString(value) : value;
  return clampMoney(raw);
}

function nullableNum(value: string) {
  const cleaned = cleanNumberString(value);
  if (cleaned.trim() === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? clampMoney(n) : null;
}

function percent(value: unknown) {
  const n = num(value);
  if (n <= 0) return "APR not added";
  return `${n.toFixed(2)}% APR`;
}

function resolvedDebtDueDate(debt: DebtRow) {
  return debt.due_date ?? nextDateFromDueDay(debt.due_day);
}

function dueLabel(date: string | null) {
  const days = daysUntil(date);

  if (days === null) return "No due date";
  if (days < 0) return `Overdue by ${Math.abs(days)} day(s)`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;

  return `Due in ${days} days`;
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

function findAmount(text: string, labels: string[]) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `${escaped}[^\\d$-]*\\$?\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)`,
      "i"
    );
    const match = text.match(regex);
    if (match?.[1]) return match[1].replace(/,/g, "");
  }

  return "";
}

function findDueDay(text: string) {
  const dateMatch =
    text.match(
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|June|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+([0-9]{1,2})\b/i
    ) || text.match(/\b([0-9]{1,2})\/[0-9]{1,2}\/[0-9]{2,4}\b/);

  if (!dateMatch?.[1]) return "";
  const day = Number(dateMatch[1]);

  if (!Number.isFinite(day) || day < 1 || day > 31) return "";
  return String(day);
}

function guessDebtName(text: string, fallback: string) {
  const lower = text.toLowerCase();

  if (lower.includes("milestone")) return "Milestone";
  if (lower.includes("credit one")) return "Credit One";
  if (lower.includes("capital one")) return "Capital One";
  if (lower.includes("ollo")) return "Ollo";
  if (lower.includes("ally")) return "Ally";
  if (lower.includes("home choice")) return "Home Choice";
  if (lower.includes("consumer portfolio")) return "Consumer Portfolio";
  if (lower.includes("sparrow")) return "Sparrow";

  return fallback || "Scanned Debt";
}

function buildDueDay(dateValue: string, dayValue: string) {
  const manualDay = nullableNum(dayValue);

  if (manualDay && manualDay >= 1 && manualDay <= 31) {
    return manualDay;
  }

  if (dateValue) {
    return new Date(`${dateValue}T00:00:00`).getDate();
  }

  return null;
}

function validateDueDay(dayValue: string) {
  if (!dayValue.trim()) return true;
  const day = num(dayValue);
  return day >= 1 && day <= 31;
}

const shellClass =
  "rounded-3xl border border-white/25 bg-black/55 p-4 shadow-2xl backdrop-blur-xl md:p-8";

const cardClass =
  "rounded-3xl border border-white/20 bg-black/55 p-5 text-white shadow-2xl backdrop-blur-xl md:p-6";

const lightCardClass =
  "rounded-3xl border border-white/80 bg-white/95 p-5 text-zinc-950 shadow-2xl md:p-6";

const inputClass =
  "w-full rounded-2xl border border-zinc-300 bg-white px-5 py-3.5 text-zinc-950 shadow-sm outline-none placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const smallButtonClass =
  "rounded-xl px-4 py-2 text-sm font-black transition";

export default function DebtPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
  const [scanReview, setScanReview] = useState<ScanReview | null>(null);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function clearAddForm() {
    setName("");
    setBalance("");
    setMinPayment("");
    setApr("");
    setCreditLimit("");
    setNote("");
    setDueDate("");
    setDueDay("");
    setKind("credit");
  }

  async function scanDebtImage(file: File | null) {
    if (!file) return;

    setScanning(true);
    setMessage("");
    setScanReview(null);

    try {
      const { text } = await ocrImageFile(file);
      const parsed = parseTransactionsScreenshot(text);
      const first = parsed?.[0];

      const guessedName = guessDebtName(text, first?.merchant || "");
      const guessedBalance =
        findAmount(text, ["current balance", "balance"]) ||
        (num(first?.amount) > 0 ? String(first?.amount) : "");

      const guessedMinimum = findAmount(text, [
        "minimum payment due",
        "min. payment due",
        "min payment due",
        "minimum payment",
        "min payment",
      ]);

      const guessedDueDay = findDueDay(text);

      const review = {
        name: guessedName,
        balance: guessedBalance,
        minPayment: guessedMinimum,
        dueDay: guessedDueDay,
        dueDate: "",
        note: `Scanned from ${file.name}`,
      };

      setScanReview(review);
      setName(review.name);
      setBalance(review.balance);
      setMinPayment(review.minPayment);
      setDueDay(review.dueDay);
      setDueDate("");
      setKind("credit");
      setNote(review.note);

      setMessage(
        "Ben found possible debt details. Review them, then tap Save Scanned Debt."
      );
    } catch (error) {
      console.error("Scanner failed:", error);
      setMessage("Scanner had trouble. You can still enter manually.");
    }

    setScanning(false);
  }

  async function saveScannedDebt() {
    if (!scanReview) {
      setMessage("Scan a statement first.");
      return;
    }

    await addDebt({
      override: {
        name: scanReview.name,
        balance: scanReview.balance,
        minPayment: scanReview.minPayment,
        apr: "",
        creditLimit: "",
        note: scanReview.note,
        kind: "credit",
        dueDate: scanReview.dueDate,
        dueDay: scanReview.dueDay,
      },
      successMessage: "Scanned debt saved to the ledger.",
    });

    setScanReview(null);
  }

  async function addDebt(options?: {
    override?: {
      name: string;
      balance: string;
      minPayment: string;
      apr: string;
      creditLimit: string;
      note: string;
      kind: "credit" | "loan";
      dueDate: string;
      dueDay: string;
    };
    successMessage?: string;
  }) {
    if (!userId || saving) return;

    const source = options?.override;

    const debtName = source?.name ?? name;
    const debtBalance = source?.balance ?? balance;
    const debtMinPayment = source?.minPayment ?? minPayment;
    const debtApr = source?.apr ?? apr;
    const debtCreditLimit = source?.creditLimit ?? creditLimit;
    const debtNote = source?.note ?? note;
    const debtKind = source?.kind ?? kind;
    const debtDueDate = source?.dueDate ?? dueDate;
    const debtDueDay = source?.dueDay ?? dueDay;

    const bal = nullableNum(debtBalance);
    const min = nullableNum(debtMinPayment);
    const aprValue = nullableNum(debtApr);
    const limit = nullableNum(debtCreditLimit);

    if (!debtName.trim() || bal === null || bal < 0) {
      setMessage("Name and valid balance required.");
      return;
    }

    if (!validateDueDay(debtDueDay)) {
      setMessage("Due day must be between 1 and 31.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      user_id: userId,
      name: debtName.trim(),
      kind: debtKind,
      balance: bal,
      min_payment: min,
      monthly_min_payment: min,
      apr: aprValue,
      credit_limit: limit,
      note: debtNote.trim() || null,
      due_date: debtDueDate || null,
      is_monthly: true,
      due_day: buildDueDay(debtDueDate, debtDueDay),
    };

    const { data, error } = await supabase
      .from("debts")
      .insert(payload)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setMessage(`Could not add debt: ${error.message}`);
      return;
    }

    setDebts((prev) => [data as DebtRow, ...prev]);
    clearAddForm();
    setImageFile(null);
    setMessage(options?.successMessage || "Debt added successfully.");
  }

  function startEdit(debt: DebtRow) {
    setEditingId(debt.id);
    setMessage("");

    setEditDebt({
      name: debt.name || "",
      balance: debt.balance === null ? "" : String(debt.balance),
      minPayment: String(debt.monthly_min_payment ?? debt.min_payment ?? ""),
      apr: debt.apr === null ? "" : String(debt.apr),
      kind: debt.kind || "credit",
      dueDate: debt.due_date || "",
      dueDay: debt.due_day === null ? "" : String(debt.due_day),
      creditLimit: debt.credit_limit === null ? "" : String(debt.credit_limit),
      note: debt.note || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDebt(null);
    setMessage("");
  }

  async function saveEdit(id: string) {
    if (!userId || !editDebt || saving) return;

    const bal = nullableNum(editDebt.balance);
    const min = nullableNum(editDebt.minPayment);
    const aprValue = nullableNum(editDebt.apr);
    const limit = nullableNum(editDebt.creditLimit);

    if (!editDebt.name.trim() || bal === null || bal < 0) {
      setMessage(
        "Name and valid balance required. Balance can be 0 if it is paid off."
      );
      return;
    }

    if (!validateDueDay(editDebt.dueDay)) {
      setMessage("Due day must be between 1 and 31.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      name: editDebt.name.trim(),
      kind: editDebt.kind,
      balance: bal,
      min_payment: min,
      monthly_min_payment: min,
      apr: aprValue,
      credit_limit: limit,
      note: editDebt.note.trim() || null,
      due_date: editDebt.dueDate || null,
      due_day: buildDueDay(editDebt.dueDate, editDebt.dueDay),
      is_monthly: true,
    };

    const { data, error } = await supabase
      .from("debts")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      setSaving(false);
      console.error("Debt update failed:", error);
      setMessage(`Could not save changes: ${error.message}`);
      return;
    }

    if (!data) {
      setSaving(false);
      setMessage(
        "Nothing was updated. This usually means Supabase RLS is blocking updates on debts."
      );
      return;
    }

    setDebts((prev) =>
      prev.map((debt) => (debt.id === id ? (data as DebtRow) : debt))
    );

    await loadDebts(userId);

    setSaving(false);
    setEditingId(null);
    setEditDebt(null);
    setMessage("Debt updated.");
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

    setDebts((prev) => prev.filter((debt) => debt.id !== id));
    setMessage("Debt deleted.");
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

  const priorityItems = useMemo<PriorityInput[]>(() => {
    return debts.map((debt) => ({
      id: debt.id,
      type: "debt" as const,
      name: debt.name,
      amount: num(debt.monthly_min_payment ?? debt.min_payment),
      balance: debt.balance,
      due_date: debt.due_date,
      due_day: debt.due_day,
      kind: debt.kind,
      apr: debt.apr,
    }));
  }, [debts]);

  const rankedDebts = useMemo(() => {
    return prioritizeMoneyItems(priorityItems);
  }, [priorityItems]);

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
      return "Add a debt and Ben will build a payoff strategy. Avalanche attacks interest. Snowball attacks momentum.";
    }

    const topPriority = rankedDebts[0];

    if (topPriority) {
      return `Priority move: handle ${
        topPriority.item.name ?? "your top debt"
      } first for ${money(topPriority.amount)}. Reason: ${topPriority.reasons.join(
        ", "
      )}.`;
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
  }, [debts, rankedDebts, highestAprDebt, smallestDebt]);

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
    <main className="min-h-screen bg-transparent p-4 text-white md:p-6">
      <div className={`${shellClass} mx-auto max-w-6xl space-y-8`}>
        <header>
          <h1 className="text-5xl font-black drop-shadow-2xl md:text-6xl">
            Debt
          </h1>
          <p className="mt-2 max-w-2xl text-base font-semibold text-white/90 md:text-lg">
            Track what you owe, edit every account, see APR clearly, and choose
            snowball or avalanche without squinting at numbers like a colonial
            tax ledger.
          </p>
        </header>

        {message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950 shadow-xl">
            {message}
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/20 bg-black/55 p-5 shadow-xl backdrop-blur-xl">
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

        <section className={lightCardClass}>
          <h2 className="text-2xl font-black">Debt Priority Board</h2>
          <p className="mt-2 text-sm font-bold text-zinc-700">
            Minimum payments ranked by due date, APR risk, and urgency.
          </p>

          <div className="mt-5 grid gap-3">
            {rankedDebts.length === 0 ? (
              <p className="text-sm font-semibold text-zinc-600">
                No debts ranked yet.
              </p>
            ) : (
              rankedDebts.slice(0, 5).map((row, index) => (
                <div
                  key={row.item.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                        #{index + 1} Debt Priority
                      </p>

                      <h3 className="mt-1 text-xl font-black text-zinc-950">
                        {row.item.name ?? "Unnamed debt"}
                      </h3>

                      <p className="mt-1 text-sm font-bold text-zinc-600">
                        {dueLabel(row.resolvedDueDate)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-2xl font-black text-zinc-950">
                        {money(row.amount)}
                      </p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                        Score {row.score}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

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

        {/* keep your scan, add, edit, and debt-list sections from here down unchanged */}
      </div>
    </main>
  );
}
