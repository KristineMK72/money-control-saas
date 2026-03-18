"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { buildFinancialSnapshot } from "@/lib/ai/finance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SummaryData = {
  next7BillsTotal: number;
  next14BillsTotal: number;
  next7IncomeTotal: number;
  shortfall7: number;
  availableCash: number;
};

type BillRow = {
  id?: string;
  name: string;
  kind?: string | null;
  category?: string | null;
  target?: number | string | null;
  saved?: number | string | null;
  due_date?: string | null;
  due?: string | null;
  priority?: number | null;
  focus?: boolean | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  is_monthly?: boolean | null;
  monthly_target?: number | string | null;
  due_day?: number | null;
};

type DebtStatusRow = {
  id?: string;
  name: string;
  kind?: string | null;
  balance?: number | string | null;
  balance_baseline?: number | string | null;
  remaining_balance?: number | string | null;
  min_payment?: number | string | null;
  due_date?: string | null;
  monthly_min_payment?: number | string | null;
  is_monthly?: boolean | null;
  due_day?: number | null;
  paid_total?: number | string | null;
};

type IncomeRow = {
  source_name?: string | null;
  amount?: number | string | null;
  date_iso?: string | null;
};

type PaymentRow = {
  id?: string;
  merchant?: string | null;
  amount?: number | string | null;
  date_iso?: string | null;
  debt_id?: string | null;
  note?: string | null;
};

type SpendRow = {
  merchant?: string | null;
  amount?: number | string | null;
  category?: string | null;
  date_iso?: string | null;
};

type NormalizedBill = {
  name: string;
  amount: number;
  dueDate?: string;
  kind?: string;
  essential: boolean;
  effectiveDueDate?: string;
  focus: boolean;
  saved: number;
};

type NormalizedDebt = {
  name: string;
  kind: string;
  remainingBalance: number;
  baselineBalance: number;
  minimumPayment: number;
  paidTotal: number;
  effectiveDueDate?: string;
  isMonthly: boolean;
  dueDay: number | null;
};

function asNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function resolveDueDate(
  dueDate?: string | null,
  dueDay?: number | null,
  isMonthly?: boolean | null
) {
  if (dueDate) return dueDate;
  if (!isMonthly || !dueDay || dueDay < 1 || dueDay > 31) return undefined;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const currentMonthDay = Math.min(dueDay, daysInCurrentMonth);
  const candidate = new Date(year, month, currentMonthDay);

  const todayMid = new Date(year, month, today.getDate());

  if (candidate >= todayMid) {
    return toIsoDate(candidate);
  }

  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const nextMonthDay = Math.min(dueDay, daysInNextMonth);

  return toIsoDate(new Date(nextYear, nextMonth, nextMonthDay));
}

function sortByDateAsc<T extends { effectiveDueDate?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTime = a.effectiveDueDate
      ? new Date(a.effectiveDueDate + "T12:00:00").getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = b.effectiveDueDate
      ? new Date(b.effectiveDueDate + "T12:00:00").getTime()
      : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function isWithinDays(dateStr?: string, days = 14) {
  if (!dateStr) return false;
  const today = new Date();
  const target = new Date(dateStr + "T12:00:00");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I’m Ben, your Money Control AI. I can help you decide what to pay first, estimate your 7-day risk, and turn your bills into a practical plan.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stressScore, setStressScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [financialSummary, setFinancialSummary] = useState<string>("");
  const [dataReady, setDataReady] = useState(false);

  function stressLabel(score: number | null) {
    if (score === null) return "Loading";
    if (score >= 80) return "Safe";
    if (score >= 60) return "Stable";
    if (score >= 40) return "Tight";
    if (score >= 20) return "High stress";
    return "Critical";
  }

  async function loadFinancialContext() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setFinancialSummary("No signed-in user found.");
        setDataReady(true);
        return;
      }

      const userId = user.id;

      const [billsRes, debtsRes, incomeRes, paymentsRes, spendRes] =
        await Promise.all([
          supabase
            .from("bills")
            .select(
              "id, name, kind, category, target, saved, due_date, due, priority, focus, balance, min_payment, is_monthly, monthly_target, due_day"
            )
            .eq("user_id", userId),

          supabase
            .from("debt_status")
            .select(
              "id, name, kind, balance, balance_baseline, remaining_balance, min_payment, due_date, monthly_min_payment, is_monthly, due_day, paid_total"
            )
            .eq("user_id", userId),

          supabase
            .from("income_entries")
            .select("source_name, amount, date_iso")
            .eq("user_id", userId)
            .order("date_iso", { ascending: false }),

          supabase
            .from("payments")
            .select("id, merchant, amount, date_iso, debt_id, note")
            .eq("user_id", userId)
            .order("date_iso", { ascending: false })
            .limit(20),

          supabase
            .from("spend_entries")
            .select("merchant, amount, category, date_iso")
            .eq("user_id", userId)
            .order("date_iso", { ascending: false })
            .limit(10),
        ]);

      const bills = (billsRes.data ?? []) as BillRow[];
      const debts = (debtsRes.data ?? []) as DebtStatusRow[];
      const incomeEntries = (incomeRes.data ?? []) as IncomeRow[];
      const payments = (paymentsRes.data ?? []) as PaymentRow[];
      const spendEntries = (spendRes.data ?? []) as SpendRow[];

      const availableCash = bills.reduce(
        (sum, b) => sum + asNumber(b.saved),
        0
      );

      const normalizedBills: NormalizedBill[] = bills.map((b) => {
        const effectiveDueDate = resolveDueDate(
          b.due_date,
          b.due_day,
          b.is_monthly
        );

        const amount = asNumber(
          b.min_payment ?? b.monthly_target ?? b.balance ?? b.target ?? 0
        );

        const essential = [
          "power",
          "utility",
          "insurance",
          "rent",
          "housing",
          "phone",
          "internet",
          "electric",
          "gas",
          "water",
        ].some((word) =>
          `${b.name || ""} ${b.category || ""}`.toLowerCase().includes(word)
        );

        return {
          name: b.name,
          amount,
          dueDate: effectiveDueDate,
          kind: (b.kind ?? b.category ?? undefined) || undefined,
          essential,
          effectiveDueDate,
          focus: !!b.focus,
          saved: asNumber(b.saved),
        };
      });

      const normalizedDebts: NormalizedDebt[] = debts.map((d) => {
        const effectiveDueDate = resolveDueDate(
          d.due_date,
          d.due_day,
          d.is_monthly
        );

        return {
          name: d.name,
          kind: d.kind ?? "debt",
          remainingBalance: asNumber(d.remaining_balance ?? d.balance),
          baselineBalance: asNumber(d.balance_baseline),
          minimumPayment: asNumber(d.monthly_min_payment ?? d.min_payment),
          paidTotal: asNumber(d.paid_total),
          effectiveDueDate,
          isMonthly: !!d.is_monthly,
          dueDay: d.due_day ?? null,
        };
      });

      const mappedBills = [
        ...normalizedBills.map((b) => ({
          name: b.name,
          amount: b.amount,
          dueDate: b.effectiveDueDate,
          kind: b.kind,
          essential: b.essential,
        })),

        ...normalizedDebts.map((d) => ({
          name: d.name,
          amount: d.minimumPayment || d.remainingBalance,
          dueDate: d.effectiveDueDate,
          kind: d.kind,
          essential: d.kind === "loan",
        })),
      ];

      const mappedIncome = incomeEntries.map((i) => ({
        name: i.source_name || "Income",
        amount: asNumber(i.amount),
        expectedDate: i.date_iso ?? undefined,
      }));

      const mappedBuckets = normalizedBills
        .filter((b) => b.focus || b.saved > 0)
        .map((b) => ({
          name: b.name,
          saved: b.saved,
          focus: b.focus,
        }));

      const snapshot = buildFinancialSnapshot({
        availableCash,
        bills: mappedBills,
        expectedIncome: mappedIncome,
        buckets: mappedBuckets,
      });

      const upcomingBills = sortByDateAsc(
        normalizedBills.filter((b) => isWithinDays(b.effectiveDueDate, 14))
      );

      const upcomingDebts = sortByDateAsc(
        normalizedDebts.filter((d) => isWithinDays(d.effectiveDueDate, 14))
      );

      const recentlyPaidDebts = normalizedDebts.filter((d) => d.paidTotal > 0);

      const billLines = normalizedBills.map((b) => {
        return `- ${b.name}: $${b.amount.toFixed(2)}${
          b.effectiveDueDate ? `, due ${b.effectiveDueDate}` : ""
        }${b.kind ? `, kind ${b.kind}` : ""}${b.focus ? ", focus bucket" : ""}${
          b.essential ? ", essential" : ""
        }`;
      });

      const debtStatusLines = normalizedDebts.map((d) => {
        return `- ${d.name}: remaining balance $${d.remainingBalance.toFixed(
          2
        )}, minimum $${d.minimumPayment.toFixed(2)}${
          d.paidTotal > 0 ? `, paid so far $${d.paidTotal.toFixed(2)}` : ""
        }${
          d.effectiveDueDate
            ? `, due ${d.effectiveDueDate}`
            : d.dueDay
            ? `, due day ${d.dueDay}`
            : ""
        }, kind ${d.kind}`;
      });

      const upcomingBillLines = upcomingBills.map((b) => {
        return `- ${b.name}: $${b.amount.toFixed(2)}${
          b.effectiveDueDate ? `, due ${b.effectiveDueDate}` : ""
        }${b.essential ? ", essential" : ""}`;
      });

      const upcomingDebtLines = upcomingDebts.map((d) => {
        return `- ${d.name}: minimum $${d.minimumPayment.toFixed(
          2
        )}, remaining balance $${d.remainingBalance.toFixed(2)}, due ${
          d.effectiveDueDate
        }`;
      });

      const recentlyPaidDebtLines = recentlyPaidDebts.map((d) => {
        return `- ${d.name}: paid $${d.paidTotal.toFixed(
          2
        )}, remaining balance $${d.remainingBalance.toFixed(2)}${
          d.effectiveDueDate ? `, due ${d.effectiveDueDate}` : ""
        }`;
      });

      const incomeLines = mappedIncome.map(
        (i) =>
          `- ${i.name}: $${asNumber(i.amount).toFixed(2)}${
            i.expectedDate ? ` expected ${i.expectedDate}` : ""
          }`
      );

      const recentPaymentsSummary = payments.map(
        (p) =>
          `- ${p.merchant || "Payment"}: $${asNumber(p.amount).toFixed(2)} on ${
            p.date_iso || "unknown date"
          }${p.note ? ` (${p.note})` : ""}`
      );

      const recentSpendingSummary = spendEntries.map(
        (s) =>
          `- ${s.merchant || "Spend"}: $${asNumber(s.amount).toFixed(2)}${
            s.category ? ` (${s.category})` : ""
          } on ${s.date_iso || "unknown date"}`
      );

      const fullSummary = `
${snapshot.summaryText}

Important Instructions For Ben:
- Use Debt Status as the truth for debt and credit balances.
- If a debt shows "paid so far", mention that payment has already been applied.
- Distinguish between remaining balance and minimum payment due.
- Call out upcoming items due within 14 days first.
- Include credit cards and loans together unless the user asks to separate them.

Upcoming Bills In Next 14 Days:
${
  upcomingBillLines.length
    ? upcomingBillLines.join("\n")
    : "- No upcoming bill records found."
}

Upcoming Debt And Credit Payments In Next 14 Days:
${
  upcomingDebtLines.length
    ? upcomingDebtLines.join("\n")
    : "- No upcoming debt or credit payments found."
}

Recently Applied Debt Payments:
${
  recentlyPaidDebtLines.length
    ? recentlyPaidDebtLines.join("\n")
    : "- No recently applied debt payments found."
}

Bill Records:
${billLines.length ? billLines.join("\n") : "- No bill records found."}

Debt Status:
${debtStatusLines.length ? debtStatusLines.join("\n") : "- No debts found."}

Expected Income:
${incomeLines.length ? incomeLines.join("\n") : "- No expected income found."}

Recent Payments:
${
  recentPaymentsSummary.length
    ? recentPaymentsSummary.join("\n")
    : "- No recent payments found."
}

Recent Spending:
${
  recentSpendingSummary.length
    ? recentSpendingSummary.join("\n")
    : "- No recent spending found."
}
`.trim();

      setStressScore(snapshot.stressScore);
      setSummary({
        next7BillsTotal: snapshot.next7BillsTotal,
        next14BillsTotal: snapshot.next14BillsTotal,
        next7IncomeTotal: snapshot.next7IncomeTotal,
        shortfall7: snapshot.shortfall7,
        availableCash,
      });
      setFinancialSummary(fullSummary);
      setDataReady(true);
    } catch (error) {
      console.error("Failed to load financial context:", error);
      setFinancialSummary("Failed to load financial context.");
      setDataReady(true);
    }
  }

  useEffect(() => {
    void loadFinancialContext();
  }, []);

  async function sendToAI(nextMessages: ChatMessage[]) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "money",
        messages: nextMessages,
        stressScore,
        financialSummary,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading || !dataReady) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await sendToAI(nextMessages);

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply || "Sorry, I couldn’t generate a response.",
        },
      ]);

      await loadFinancialContext();
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong while generating your money plan.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!dataReady || !financialSummary) return;

    let cancelled = false;

    async function loadInitialOutlook() {
      setLoading(true);

      try {
        const starterMessages: ChatMessage[] = [
          {
            role: "user",
            content:
              "Give me my 7-day outlook, stress level, what I should focus on first, explicitly mention any debt payments already applied, and list upcoming debt or credit payments due soon by date.",
          },
        ];

        const data = await sendToAI(starterMessages);

        if (cancelled) return;

        setMessages([
          {
            role: "assistant",
            content: data.reply || "I couldn’t load your 7-day outlook yet.",
          },
        ]);
      } catch {
        if (cancelled) return;

        setMessages([
          {
            role: "assistant",
            content:
              "I couldn’t load your financial outlook yet. Try asking what you should pay first.",
          },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialOutlook();

    return () => {
      cancelled = true;
    };
  }, [dataReady, financialSummary]);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Ask Ben</div>
            <h1 style={styles.title}>Money AI Assistant</h1>
            <p style={styles.subtitle}>
              Ask Ben about bills, weekly funding, daily targets, or what to
              prioritize.
            </p>
          </div>
        </div>

        <div style={styles.forecastCard}>
          <div style={styles.forecastTop}>
            <div>
              <div style={styles.forecastTitle}>Financial Radar</div>
              <div style={styles.forecastSub}>
                Your forward-looking money snapshot for the next 7 to 14 days.
              </div>
            </div>

            <div style={styles.scoreCard}>
              <div style={styles.scoreLabel}>Stress Score</div>
              <div style={styles.scoreValue}>
                {stressScore !== null ? stressScore : "—"}
              </div>
              <div style={styles.scoreHint}>{stressLabel(stressScore)}</div>
            </div>
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Bills next 7 days</div>
              <div style={styles.statValue}>
                ${summary ? summary.next7BillsTotal.toFixed(2) : "—"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Bills next 14 days</div>
              <div style={styles.statValue}>
                ${summary ? summary.next14BillsTotal.toFixed(2) : "—"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Income next 7 days</div>
              <div style={styles.statValue}>
                ${summary ? summary.next7IncomeTotal.toFixed(2) : "—"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>7-day shortfall</div>
              <div style={styles.statValue}>
                ${summary ? summary.shortfall7.toFixed(2) : "—"}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.quickRow}>
          <button
            type="button"
            style={styles.quickBtn}
            onClick={() => sendMessage("What should I pay first?")}
            disabled={loading || !dataReady}
          >
            What should I pay first?
          </button>

          <button
            type="button"
            style={styles.quickBtn}
            onClick={() => sendMessage("Give me a 7-day survival plan.")}
            disabled={loading || !dataReady}
          >
            7-day survival plan
          </button>

          <button
            type="button"
            style={styles.quickBtn}
            onClick={() =>
              sendMessage("How much do I need to earn per day this week?")
            }
            disabled={loading || !dataReady}
          >
            Daily target
          </button>
        </div>

        <div style={styles.chatBox}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                ...(msg.role === "user" ? styles.user : styles.assistant),
              }}
            >
              <div style={styles.messageLabel}>
                {msg.role === "user" ? "You" : "Ben"}
              </div>
              <div style={styles.messageText}>{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.message, ...styles.assistant }}>
              <div style={styles.messageLabel}>Ben</div>
              <div style={styles.messageText}>Thinking...</div>
            </div>
          )}
        </div>

        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void sendMessage();
              }
            }}
            placeholder="Ask what to pay first, your 7-day risk, or your daily target..."
            style={styles.input}
            disabled={loading || !dataReady}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={loading || !dataReady}
            style={styles.button}
          >
            Send
          </button>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8f5ef 0%, #f4efe7 100%)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 960,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.06)",
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8a7f73",
    marginBottom: 8,
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.05,
    color: "#1c1917",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 0,
    color: "#57534e",
    fontSize: 15,
  },
  forecastCard: {
    border: "1px solid #e7e5e4",
    borderRadius: 18,
    background: "#fafaf9",
    padding: 18,
    marginBottom: 16,
  },
  forecastTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  forecastTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#78716c",
    fontWeight: 700,
    marginBottom: 6,
  },
  forecastSub: {
    color: "#57534e",
    fontSize: 14,
    maxWidth: 520,
  },
  scoreCard: {
    minWidth: 140,
    borderRadius: 16,
    padding: 14,
    background: "#ffffff",
    border: "1px solid #e7e5e4",
    textAlign: "center",
  },
  scoreLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#78716c",
    marginBottom: 6,
    fontWeight: 700,
  },
  scoreValue: {
    fontSize: 34,
    lineHeight: 1,
    fontWeight: 800,
    color: "#1c1917",
  },
  scoreHint: {
    marginTop: 6,
    fontSize: 13,
    color: "#57534e",
    fontWeight: 600,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  statCard: {
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #ece7df",
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: "#78716c",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 700,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1c1917",
  },
  quickRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  quickBtn: {
    border: "1px solid #d6d3d1",
    borderRadius: 999,
    padding: "10px 14px",
    background: "#fff",
    color: "#1c1917",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  chatBox: {
    height: 430,
    overflowY: "auto",
    borderRadius: 18,
    border: "1px solid #e7e5e4",
    background: "#fcfcfb",
    padding: 16,
    marginBottom: 14,
  },
  message: {
    maxWidth: "88%",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    whiteSpace: "pre-wrap",
  },
  user: {
    marginLeft: "auto",
    background: "#dbeafe",
  },
  assistant: {
    marginRight: "auto",
    background: "#f3f4f6",
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 6,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 1.5,
    color: "#111827",
  },
  inputRow: {
    display: "flex",
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    border: "1px solid #d6d3d1",
    padding: "14px 16px",
    fontSize: 16,
    outline: "none",
    background: "#fff",
  },
  button: {
    border: "none",
    borderRadius: 14,
    padding: "14px 18px",
    fontSize: 16,
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
};
