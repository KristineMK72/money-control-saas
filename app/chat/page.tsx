"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clampMoney, money } from "@/lib/money/math";
import {
  currentMonthStartISO,
  daysUntil,
  isWithinNextDays,
  nextDateFromDueDay,
  todayLocalISO,
} from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type BenMasterRow = {
  user_id: string;
  month?: string | null;
  total_income?: number | string | null;
  total_spend?: number | string | null;
  bills?: number | string | null;
  total_bills?: number | string | null;
  payments?: number | string | null;
  leftover?: number | string | null;
  net?: number | string | null;
  pressure_pct?: number | string | null;
  total_debt?: number | string | null;
  total_debt_balance?: number | string | null;
  total_debt_minimums?: number | string | null;
  monthly_minimums?: number | string | null;
};

type BillRow = {
  id: string;
  user_id?: string;
  name: string | null;
  kind?: string | null;
  category?: string | null;
  target?: number | string | null;
  saved?: number | string | null;
  due_date?: string | null;
  due?: string | null;
  priority?: number | string | null;
  focus?: boolean | null;
  balance?: number | string | null;
  apr?: number | string | null;
  min_payment?: number | string | null;
  credit_limit?: number | string | null;
  is_monthly?: boolean | null;
  monthly_target?: number | string | null;
  due_day?: number | string | null;
  created_at?: string | null;
};

type DebtRow = {
  id: string;
  user_id?: string;
  name: string | null;
  kind?: string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  monthly_min_payment?: number | string | null;
  due_date?: string | null;
  due_day?: number | string | null;
  apr?: number | string | null;
  credit_limit?: number | string | null;
  note?: string | null;
  is_monthly?: boolean | null;
  created_at?: string | null;
};

type MoneyContext = {
  master: BenMasterRow | null;
  bills: BillRow[];
  debts: DebtRow[];
};

function formatDate(value?: string | null) {
  if (!value) return "No due date";

  const clean = value.slice(0, 10);
  const [y, m, d] = clean.split("-").map(Number);

  if (!y || !m || !d) return value;

  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dueText(value?: string | null) {
  const days = daysUntil(value);

  if (days === null) return "No due date";
  if (days < 0) return `${formatDate(value)} — overdue by ${Math.abs(days)} day(s)`;
  if (days === 0) return `${formatDate(value)} — due today`;
  if (days === 1) return `${formatDate(value)} — due tomorrow`;
  if (days <= 7) return `${formatDate(value)} — due in ${days} days`;

  return formatDate(value);
}

function resolvedBillDueDate(bill: BillRow) {
  return bill.due_date ?? bill.due ?? nextDateFromDueDay(bill.due_day);
}

function resolvedDebtDueDate(debt: DebtRow) {
  return debt.due_date ?? nextDateFromDueDay(debt.due_day);
}

function billAmount(bill: BillRow) {
  return clampMoney(
    bill.target ?? bill.monthly_target ?? bill.balance ?? bill.min_payment
  );
}

function debtMinimum(debt: DebtRow) {
  return clampMoney(debt.monthly_min_payment ?? debt.min_payment);
}

function buildFinancialSummary(context: MoneyContext) {
  const { master, bills, debts } = context;

  const incomeTotal = clampMoney(master?.total_income);
  const spendTotal = clampMoney(master?.total_spend);

  const billsTotal =
    clampMoney(master?.total_bills ?? master?.bills) ||
    bills.reduce((sum, row) => sum + billAmount(row), 0);

  const paymentsTotal = clampMoney(master?.payments);

  const debtBalance =
    clampMoney(master?.total_debt_balance ?? master?.total_debt) ||
    debts.reduce((sum, row) => sum + clampMoney(row.balance), 0);

  const debtMinimums =
    clampMoney(master?.total_debt_minimums ?? master?.monthly_minimums) ||
    debts.reduce((sum, row) => sum + debtMinimum(row), 0);

  const net =
    clampMoney(master?.net ?? master?.leftover) ||
    incomeTotal - spendTotal - billsTotal - debtMinimums;

  const pressure = clampMoney(master?.pressure_pct);

  const priorityItems: PriorityInput[] = [
    ...bills.map((bill) => ({
      id: bill.id,
      type: "bill" as const,
      name: bill.name,
      amount: billAmount(bill),
      due_date: bill.due_date,
      due: bill.due,
      due_day: bill.due_day,
      category: bill.category,
      kind: bill.kind,
      focus: bill.focus,
    })),
    ...debts.map((debt) => ({
      id: debt.id,
      type: "debt" as const,
      name: debt.name,
      amount: debtMinimum(debt),
      balance: debt.balance,
      due_date: debt.due_date,
      due_day: debt.due_day,
      kind: debt.kind,
      apr: debt.apr,
    })),
  ];

  const rankedPriorities = prioritizeMoneyItems(priorityItems);

  const priorityLines =
    rankedPriorities.length > 0
      ? rankedPriorities
          .slice(0, 10)
          .map((row, index) => {
            return `${index + 1}. ${row.item.type.toUpperCase()}: ${
              row.item.name ?? "Unnamed"
            } — ${money(row.amount)}; due ${dueText(
              row.resolvedDueDate
            )}; score ${row.score}; reasons: ${row.reasons.join(", ")}`;
          })
          .join("\n")
      : "- No priority items found.";

  const upcomingBills = bills.filter((bill) =>
    isWithinNextDays(resolvedBillDueDate(bill), 7)
  );

  const upcomingDebts = debts.filter((debt) =>
    isWithinNextDays(resolvedDebtDueDate(debt), 7)
  );

  const overdueBills = bills.filter((bill) => {
    const days = daysUntil(resolvedBillDueDate(bill));
    return days !== null && days < 0;
  });

  const overdueDebts = debts.filter((debt) => {
    const days = daysUntil(resolvedDebtDueDate(debt));
    return days !== null && days < 0;
  });

  const next7Lines = [
    ...upcomingBills.map((bill) => {
      const due = resolvedBillDueDate(bill);

      return `- BILL: ${bill.name ?? "Unnamed bill"} — ${money(
        billAmount(bill)
      )}; ${dueText(due)}; category: ${
        bill.category ?? "uncategorized"
      }; priority: ${bill.priority ?? "not set"}; focus: ${
        bill.focus ? "yes" : "no"
      }`;
    }),

    ...upcomingDebts.map((debt) => {
      const due = resolvedDebtDueDate(debt);

      return `- DEBT: ${debt.name ?? "Unnamed debt"} — minimum ${money(
        debtMinimum(debt)
      )}; balance ${money(clampMoney(debt.balance))}; ${dueText(
        due
      )}; APR: ${debt.apr ?? "unknown"}; type: ${debt.kind ?? "debt"}`;
    }),
  ].join("\n");

  const overdueLines = [
    ...overdueBills.map((bill) => {
      const due = resolvedBillDueDate(bill);

      return `- OVERDUE BILL: ${bill.name ?? "Unnamed bill"} — ${money(
        billAmount(bill)
      )}; ${dueText(due)}`;
    }),

    ...overdueDebts.map((debt) => {
      const due = resolvedDebtDueDate(debt);

      return `- OVERDUE DEBT: ${debt.name ?? "Unnamed debt"} — minimum ${money(
        debtMinimum(debt)
      )}; ${dueText(due)}`;
    }),
  ].join("\n");

  const billLines =
    bills.length > 0
      ? bills
          .map((bill) => {
            const due = resolvedBillDueDate(bill);

            return `- ${bill.name ?? "Unnamed bill"}: ${money(
              billAmount(bill)
            )}; due ${dueText(due)}; category: ${
              bill.category ?? "uncategorized"
            }; priority: ${bill.priority ?? "not set"}; focus: ${
              bill.focus ? "yes" : "no"
            }`;
          })
          .join("\n")
      : "- No bill rows found.";

  const debtLines =
    debts.length > 0
      ? debts
          .map((debt) => {
            const due = resolvedDebtDueDate(debt);

            return `- ${debt.name ?? "Unnamed debt"}: balance ${money(
              clampMoney(debt.balance)
            )}; minimum ${money(debtMinimum(debt))}; due ${dueText(
              due
            )}; APR: ${debt.apr ?? "unknown"}; type: ${
              debt.kind ?? "debt"
            }`;
          })
          .join("\n")
      : "- No debt rows found.";

  return `
ASKBEN FINANCIAL CONTEXT
Today: ${formatDate(todayLocalISO())}
Current month starts: ${formatDate(currentMonthStartISO())}

MONTHLY SNAPSHOT FROM ben_master_monthly
- Income logged this month: ${money(incomeTotal)}
- Spending logged this month: ${money(spendTotal)}
- Bills total: ${money(billsTotal)}
- Debt payments logged this month: ${money(paymentsTotal)}
- Total debt balance: ${money(debtBalance)}
- Monthly debt minimums: ${money(debtMinimums)}
- Estimated net after spending, bills, and debt minimums: ${money(net)}
- Debt pressure: ${pressure.toFixed(1)}%

TOP PRIORITIES FROM PRIORITY ENGINE
${priorityLines}

OVERDUE ITEMS — EXACT LIST
${overdueLines || "- No overdue bills or debts found."}

NEXT 7 DAYS — EXACT DUE ITEMS
${next7Lines || "- Nothing is due in the next 7 days based on due_date, due, or due_day."}

BILLS FROM bills TABLE
${billLines}

DEBTS FROM debts TABLE
${debtLines}

RULES FOR BEN
- This financial context is the source of truth.
- If bills or debts are listed above, never say the ledger has not been shared.
- When asked what to pay first, use "TOP PRIORITIES FROM PRIORITY ENGINE" first.
- Explain the recommendation using the listed reasons.
- When asked what is due in the next 7 days, use the section called "NEXT 7 DAYS — EXACT DUE ITEMS."
- When asked what is overdue, use the section called "OVERDUE ITEMS — EXACT LIST."
- Be specific. Name the bill, debt, amount, and due date when available.
- If data is missing, say exactly what is missing instead of pretending nothing exists.
`.trim();
}

const BEN_PERSONA = `
You are Benjamin Franklin serving as a modern financial triage advisor.

Voice:
- Wise, warm, practical, and slightly witty.
- Use light colonial flavor, not Shakespeare cosplay.
- Occasional phrases are welcome: "good friend", "thy", "pray tell", "verily", "hath".
- Keep advice clear, modern, and useful.
- Sound intelligent and grounded, not gimmicky.

Financial behavior:
- Use the supplied financialSummary as factual context.
- Give concrete next steps.
- For urgent money questions, prioritize survival: housing, utilities, transportation, food, insurance, minimum payments, then extra debt payments.
- Do not shame the user.
- Do not recommend risky financial decisions.
- If the user asks what to pay first, give a ranked list using the TOP PRIORITIES section.
- Explain why each item is ranked using the priority reasons.
- If the user asks what is due this week or in the next 7 days, answer only from the NEXT 7 DAYS section.
- If the user asks for a plan, give a short action plan.
`.trim();

export default function ChatPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Good morrow, friend. I am Benjamin Franklin, at thy service in matters of coin and prudence. Ask me what to pay first, what is due soon, or how to steady thy finances this week.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [moneyContext, setMoneyContext] = useState<MoneyContext>({
    master: null,
    bills: [],
    debts: [],
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function loadMoneyContext() {
      setNotice("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setNotice(sessionError.message);
        return;
      }

      const user = session?.user;

      if (!user) {
        setNotice("Log in to let Ben see your money snapshot.");
        return;
      }

      const monthStart = currentMonthStartISO();

      const [masterResult, billsResult, debtsResult] = await Promise.all([
        supabase
          .from("ben_master_monthly")
          .select("*")
          .eq("user_id", user.id)
          .gte("month", monthStart)
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("bills")
          .select("*")
          .eq("user_id", user.id)
          .order("due_date", { ascending: true, nullsFirst: false }),

        supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)
          .order("due_date", { ascending: true, nullsFirst: false }),
      ]);

      if (masterResult.error) {
        setNotice(`ben_master_monthly: ${masterResult.error.message}`);
        return;
      }

      if (billsResult.error) {
        setNotice(`bills: ${billsResult.error.message}`);
        return;
      }

      if (debtsResult.error) {
        setNotice(`debts: ${debtsResult.error.message}`);
        return;
      }

      setMoneyContext({
        master: (masterResult.data || null) as BenMasterRow | null,
        bills: (billsResult.data || []) as BillRow[],
        debts: (debtsResult.data || []) as DebtRow[],
      });
    }

    void loadMoneyContext();
  }, [supabase]);

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();

    if (!text || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const financialSummary = buildFinancialSummary(moneyContext);

      console.log("ASKBEN FINANCIAL SUMMARY SENT:", financialSummary);

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "money",
          messages: newMessages,
          financialSummary,
          context: BEN_PERSONA,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Ben could not answer right now.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ||
            "Forgive me, friend. My thoughts are unclear at present.",
        },
      ]);
    } catch (err) {
      console.error("AskBen chat error:", err);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Forgive me, good friend. The wires between us are troubled. Pray ask again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const hasData =
    !!moneyContext.master ||
    moneyContext.bills.length > 0 ||
    moneyContext.debts.length > 0;

  return (
    <main className="min-h-screen bg-transparent p-4 pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/30 shadow-xl">
            <img
              src="/ben.png"
              alt="Benjamin Franklin"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-4xl font-black text-white">Ask Ben</h1>
            <p className="text-white/75">
              Benjamin Franklin’s Counsel on Money
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 text-sm font-semibold text-amber-950 shadow-xl">
            {notice}
          </div>
        )}

        {!notice && (
          <div className="mb-4 rounded-2xl border border-white/15 bg-black/45 p-4 text-sm font-semibold text-white/80 shadow-xl backdrop-blur-xl">
            {hasData
              ? `Ben can currently see ${moneyContext.bills.length} bill(s), ${
                  moneyContext.debts.length
                } debt(s), and ${
                  moneyContext.master
                    ? "the monthly master snapshot"
                    : "no monthly master snapshot"
                }.`
              : "Ben is connected, but no money rows were found yet."}
          </div>
        )}

        <div className="flex h-[65vh] flex-col overflow-hidden rounded-3xl border border-white/20 bg-black/70 shadow-2xl backdrop-blur-2xl">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm font-semibold leading-relaxed shadow-lg md:text-base ${
                    msg.role === "user"
                      ? "rounded-br-none bg-yellow-400 text-zinc-950"
                      : "rounded-bl-none bg-white/95 text-zinc-950"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-3xl rounded-bl-none bg-white/95 px-5 py-4 text-zinc-950">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 delay-150" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 delay-300" />
                  <span className="ml-2 text-sm text-zinc-500">
                    Ben is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-white/20 bg-black/80 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendMessage();
                }}
                placeholder="What should I pay first, good sir?"
                className="flex-1 rounded-2xl bg-white/90 px-6 py-4 text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={loading}
              />

              <button
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-yellow-400 px-8 font-black text-zinc-950 transition hover:bg-yellow-300 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "What should I pay first this week?",
            "What is due in the next 7 days?",
            "Give me a 7-day survival plan, good sir.",
            "How much coin must I earn daily?",
            "What is my greatest risk at present?",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              disabled={loading}
              className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
