"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BenBubble from "@/components/BenBubble";
import GovernorsOrders from "@/components/GovernorsOrders";
import XpBar from "@/components/XpBar";
import { BenEngine } from "@/lib/ben/engine";
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO } from "@/lib/money/dates";
import { prioritizeMoneyItems, type PriorityInput } from "@/lib/money/priorityV2";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type SpendRow    = { id: string; amount: number | string | null; category: string | null };
type BillRow     = { id: string; name: string | null; kind?: string | null; category?: string | null; target?: number | string | null; monthly_target?: number | string | null; balance?: number | string | null; min_payment?: number | string | null; due_date?: string | null; due?: string | null; due_day?: number | string | null; focus?: boolean | null };
type DebtRow     = { id: string; name: string | null; kind?: string | null; balance?: number | string | null; min_payment?: number | string | null; monthly_min_payment?: number | string | null; due_date?: string | null; due_day?: number | string | null; apr?: number | string | null };
type PaymentRow  = { id: string; amount: number | string | null; bill_id: string | null; debt_id: string | null; date_iso: string | null; created_at?: string | null };
type BenMasterRow = { user_id: string; total_income?: number | string | null; total_spend?: number | string | null; bills?: number | string | null; total_bills?: number | string | null; total_debt?: number | string | null; total_debt_minimums?: number | string | null; payments?: number | string | null; leftover?: number | string | null; pressure_pct?: number | string | null; month?: string | null };
type ProfileRow  = { xp?: number | null; level?: number | null; reputation?: number | null };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getColonialRank(rep: number) {
  if (rep >= 5000) return "Defender of the Treasury";
  if (rep >= 2500) return "Founding Financier";
  if (rep >= 1000) return "Governor";
  if (rep >= 500)  return "Colonial Magistrate";
  if (rep >= 250)  return "Treasury Keeper";
  if (rep >= 100)  return "Town Recorder";
  return "Apprentice Clerk";
}

function billAmount(b: BillRow) { return clampMoney(b.target ?? b.monthly_target ?? b.balance ?? b.min_payment); }
function debtMin(d: DebtRow)    { return clampMoney(d.monthly_min_payment ?? d.min_payment); }

function dueLabel(days: number | null) {
  if (days === null) return "No due date";
  if (days < 0)  return `Overdue ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

/** Months to payoff a debt at a fixed monthly payment (simple interest approx) */
function monthsToPayoff(balance: number, monthlyPayment: number, annualApr: number): number {
  if (balance <= 0 || monthlyPayment <= 0) return 0;
  const r = annualApr / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  const n = -Math.log(1 - (r * balance) / monthlyPayment) / Math.log(1 + r);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 999;
}

/** Total interest paid over N months */
function totalInterest(balance: number, monthlyPayment: number, annualApr: number): number {
  const months = monthsToPayoff(balance, monthlyPayment, annualApr);
  return Math.max(0, monthlyPayment * months - balance);
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ title, subtitle, children, accent }: { title: string; subtitle?: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(12,6,3,0.92)", border: `1px solid ${accent ? "rgba(201,168,76,0.55)" : "rgba(107,68,35,0.42)"}`, backdropFilter: "blur(6px)" }}>
      <div className="mb-4 pb-3" style={{ borderBottom: "1px solid rgba(107,68,35,0.25)" }}>
        <h2 className="font-cinzel text-base font-bold" style={{ color: "#c9a84c" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5 italic" style={{ color: "#7a5d3a" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Tile({ label, value, helper, color = "#c9a84c" }: { label: string; value: string; helper?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: "rgba(107,68,35,0.1)", border: "1px solid rgba(107,68,35,0.28)" }}>
      <p className="font-cinzel text-[10px] uppercase tracking-widest mb-1" style={{ color: "#7a5d3a" }}>{label}</p>
      <p className="font-cinzel text-xl font-bold" style={{ color }}>{value}</p>
      {helper && <p className="text-[11px] mt-1 italic" style={{ color: "#5a4030" }}>{helper}</p>}
    </div>
  );
}

// ── SVG Budget Donut ──────────────────────────────────────────────────────────

function BudgetDonut({ income, spend, bills, debtMins, net }: { income: number; spend: number; bills: number; debtMins: number; net: number }) {
  const r = 68; const cx = 90; const cy = 90;
  const circ = 2 * Math.PI * r;
  const total = Math.max(income, spend + bills + debtMins, 1);

  const segments = [
    { label: "Spend",      value: spend,    color: "#f59e0b" },
    { label: "Bills",      value: bills,    color: "#60a5fa" },
    { label: "Debt Min",   value: debtMins, color: "#f87171" },
    { label: "Leftover",   value: Math.max(0, net), color: "#4ade80" },
  ];

  let offset = -Math.PI / 2; // start from top
  const paths = segments.map((seg) => {
    const frac  = Math.min(seg.value / total, 1);
    const dash  = frac * circ;
    const gap   = circ - dash;
    const startOffset = -(offset / (2 * Math.PI)) * circ;
    offset += frac * 2 * Math.PI;
    return { ...seg, dash, gap, startOffset: startOffset + circ * 0.25 };
  });

  const hasData = income > 0 || spend > 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <svg width={180} height={180}>
          {!hasData ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(107,68,35,0.25)" strokeWidth={20} />
          ) : (
            paths.map((p) => (
              p.value > 0 && (
                <circle
                  key={p.label}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={20}
                  strokeDasharray={`${p.dash} ${p.gap}`}
                  strokeDashoffset={p.startOffset}
                  style={{ transition: "stroke-dasharray 0.7s ease" }}
                />
              )
            ))
          )}
          {/* inner hole */}
          <circle cx={cx} cy={cy} r={48} fill="rgba(8,4,2,0.95)" />
          <text x={cx} y={cy - 8}  textAnchor="middle" fontSize={11} fill="#7a5d3a" fontFamily="Cinzel, serif">NET</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={15} fill={net >= 0 ? "#4ade80" : "#f87171"} fontFamily="Cinzel, serif" fontWeight="bold">
            {money(net)}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full">
        {[
          { label: "Income",   value: income,   color: "#c9a84c" },
          ...segments,
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-xs" style={{ color: "#9a7d5a" }}>{label}</span>
            </div>
            <div className="flex-1 mx-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(107,68,35,0.2)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min((value / Math.max(income, 1)) * 100, 100)}%`, background: color, transition: "width 0.7s ease" }} />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>{money(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SVG Spending Category Bars ────────────────────────────────────────────────

function SpendingBars({ categories }: { categories: [string, number][] }) {
  const top    = categories.slice(0, 7);
  const maxVal = top[0]?.[1] ?? 1;

  const COLORS = ["#f59e0b","#60a5fa","#c084fc","#34d399","#fb923c","#f472b6","#a3e635"];

  if (top.length === 0) {
    return <p className="text-xs italic text-center py-4" style={{ color: "#5a4030" }}>No spending logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {top.map(([cat, val], i) => (
        <div key={cat}>
          <div className="flex justify-between mb-1">
            <span className="text-xs capitalize" style={{ color: "#c9a84c" }}>{cat}</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>{money(val)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(107,68,35,0.18)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${(val / maxVal) * 100}%`, background: COLORS[i % COLORS.length], transition: "width 0.8s ease" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SVG Financial Health Gauge ────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  // Score 0–100. Arc spans 200° from -190° to 20° (centered at bottom)
  const S = Math.max(0, Math.min(100, score));
  const cx = 90; const cy = 90; const r = 66;
  const startAngle = -200; const sweep = 200;
  const angle = startAngle + (S / 100) * sweep;
  const toRad  = (d: number) => (d * Math.PI) / 180;

  function arcPath(start: number, end: number) {
    const s  = toRad(start); const e = toRad(end);
    const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const needleX = cx + (r - 12) * Math.cos(toRad(angle));
  const needleY = cy + (r - 12) * Math.sin(toRad(angle));
  const needleColor = S < 35 ? "#f87171" : S < 65 ? "#f59e0b" : "#4ade80";
  const label       = S < 35 ? "At Risk"  : S < 65 ? "Caution"  : S < 85 ? "Healthy" : "Excellent";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={180} height={120}>
        {/* Track */}
        <path d={arcPath(startAngle, startAngle + sweep)} fill="none" stroke="rgba(107,68,35,0.2)" strokeWidth={14} strokeLinecap="round" />
        {/* Colored fill */}
        <path d={arcPath(startAngle, angle)} fill="none" stroke={needleColor} strokeWidth={14} strokeLinecap="round" style={{ transition: "all 0.9s ease" }} />
        {/* Needle dot */}
        <circle cx={needleX} cy={needleY} r={7} fill={needleColor} />
        {/* Center labels */}
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={22} fill={needleColor} fontFamily="Cinzel, serif" fontWeight="bold">{S}</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fontSize={10} fill="#7a5d3a" fontFamily="Cinzel, serif">/100</text>
      </svg>
      <p className="font-cinzel text-sm font-bold" style={{ color: needleColor }}>{label}</p>
    </div>
  );
}

// ── Debt Payoff Scenarios ─────────────────────────────────────────────────────

function DebtScenarios({ debts }: { debts: DebtRow[] }) {
  const EXTRA = 75;

  const rows = debts
    .filter((d) => clampMoney(d.balance) > 0)
    .map((d) => {
      const bal  = clampMoney(d.balance);
      const min  = Math.max(debtMin(d), 10);
      const apr  = clampMoney(d.apr);
      const mMin = monthsToPayoff(bal, min,        apr);
      const mExt = monthsToPayoff(bal, min + EXTRA, apr);
      const saved = mMin - mExt;
      const intMin = totalInterest(bal, min,        apr);
      const intExt = totalInterest(bal, min + EXTRA, apr);
      const intSaved = intMin - intExt;
      return { name: d.name ?? "Debt", bal, min, apr, mMin, mExt, saved, intSaved };
    })
    .sort((a, b) => b.apr - a.apr); // avalanche order

  if (rows.length === 0) {
    return <p className="text-xs italic text-center py-4" style={{ color: "#5a4030" }}>No debts on record. The treasury is clear.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs italic" style={{ color: "#7a5d3a" }}>
        What if you paid ${EXTRA} extra/month on each debt? (Sorted by APR — avalanche method)
      </p>
      {rows.map((row) => {
        const improvement = row.saved > 0;
        return (
          <div key={row.name} className="rounded-xl p-4" style={{ background: "rgba(107,68,35,0.1)", border: "1px solid rgba(107,68,35,0.28)" }}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-cinzel font-bold text-sm" style={{ color: "#e8d5b7" }}>{row.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#7a5d3a" }}>
                  Balance {money(row.bal)} · APR {row.apr > 0 ? `${row.apr}%` : "—"} · Min ${row.min}/mo
                </p>
              </div>
              {row.apr > 0 && (
                <span className="text-[10px] font-cinzel font-bold rounded-full px-2 py-0.5" style={{ background: row.apr > 20 ? "rgba(248,113,113,0.15)" : "rgba(201,168,76,0.12)", color: row.apr > 20 ? "#f87171" : "#c9a84c" }}>
                  {row.apr}% APR
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <p className="text-[10px] uppercase tracking-widest font-cinzel mb-1" style={{ color: "#7a5d3a" }}>At minimum</p>
                <p className="text-lg font-bold font-cinzel" style={{ color: "#f87171" }}>
                  {row.mMin < 999 ? `${row.mMin} mo` : "∞"}
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: improvement ? "rgba(74,222,128,0.08)" : "rgba(107,68,35,0.1)", border: `1px solid ${improvement ? "rgba(74,222,128,0.3)" : "rgba(107,68,35,0.28)"}` }}>
                <p className="text-[10px] uppercase tracking-widest font-cinzel mb-1" style={{ color: "#7a5d3a" }}>+${EXTRA}/mo</p>
                <p className="text-lg font-bold font-cinzel" style={{ color: improvement ? "#4ade80" : "#c9a84c" }}>
                  {row.mExt < 999 ? `${row.mExt} mo` : "∞"}
                </p>
              </div>
            </div>

            {improvement && row.saved > 0 && (
              <p className="mt-2 text-xs text-center" style={{ color: "#4ade80" }}>
                ✦ Save {row.saved} month{row.saved > 1 ? "s" : ""}{row.intSaved > 0 ? ` & ${money(row.intSaved)} in interest` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AI Advisor streaming section ──────────────────────────────────────────────

function AiAdvisor({ context }: { context: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const streamFrom = useCallback(async (body: object) => {
    setText("");
    setStatus("loading");

    try {
      const res = await fetch("/api/ben-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const raw = await res.text();
          if (
            raw &&
            raw.length < 300 &&
            !raw.includes('["$') &&
            !raw.startsWith("<!")
          ) {
            errMsg = raw;
          }
        } catch {
          // keep default errMsg
        }
        setText(`Error from Ben's quill: ${errMsg}`);
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let lineBuffer = "";

      const applyDelta = (raw: string): boolean => {
        if (!raw || raw === "[DONE]") return raw === "[DONE]";
        try {
          const delta = JSON.parse(raw)?.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            setText(full);
          }
        } catch {
          // ignore malformed JSON lines
        }
        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const toProcess = lineBuffer + chunk;
        const lines = toProcess.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (applyDelta(raw)) {
            lineBuffer = "";
            break;
          }
        }
      }

      // Flush leftover partial line
      if (lineBuffer.startsWith("data: ")) {
        applyDelta(lineBuffer.slice(6).trim());
      }

      setStatus("done");
    } catch (e) {
      setText(`Could not reach Ben's quill: ${String(e)}`);
      setStatus("error");
    }
  }, []);

  // Auto-run when financial context is ready
  useEffect(() => {
    if (context && status === "idle") {
      void streamFrom({ financialContext: context });
    }
  }, [context, status, streamFrom]);

  // Keep response pane scrolled to the latest token
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  async function handleAsk() {
    if (!question.trim() || asking) return;
    setAsking(true);
    await streamFrom({ financialContext: context, question: question.trim() });
    setQuestion("");
    setAsking(false);
  }

  /** Render markdown-ish bold: whole-line headers + inline **text** */
  function renderText(raw: string) {
    const lines = raw.split("\n");

    return lines.map((line, i) => {
      if (line.trim() === "") {
        return <div key={i} className="h-1" />;
      }

      // Whole-line bold headers (e.g. **TOP PRIORITY**)
      if (
        line.startsWith("**") &&
        line.endsWith("**") &&
        line.indexOf("**", 2) === line.length - 2
      ) {
        return (
          <p
            key={i}
            className="font-cinzel font-bold mt-4 mb-1 text-sm"
            style={{ color: "#c9a84c" }}
          >
            {line.slice(2, -2)}
          </p>
        );
      }

      // Inline **bold** anywhere in the sentence
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const re = /\*\*(.+?)\*\*/g;
      let match: RegExpExecArray | null;

      while ((match = re.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        parts.push(
          <span
            key={`${i}-${match.index}`}
            className="font-cinzel font-bold"
            style={{ color: "#c9a84c" }}
          >
            {match[1]}
          </span>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      return (
        <p
          key={i}
          className="text-sm leading-relaxed"
          style={{ color: "#e8d5b7" }}
        >
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Response area */}
      <div
        ref={scrollRef}
        className="rounded-xl p-4 min-h-[120px] max-h-[420px] overflow-y-auto"
        style={{
          background: "rgba(5,2,1,0.88)",
          border: "1px solid rgba(107,68,35,0.35)",
        }}
      >
        {status === "idle" && (
          <p
            className="text-sm italic text-center mt-6"
            style={{ color: "#5a4030" }}
          >
            Awaiting your financial data…
          </p>
        )}
        {status === "loading" && text === "" && (
          <p
            className="font-cinzel text-sm animate-pulse text-center mt-6"
            style={{ color: "#c9a84c" }}
          >
            Ben is consulting the ledgers…
          </p>
        )}
        {text && renderText(text)}
        {status === "loading" && text && (
          <span
            className="inline-block w-2 h-4 align-text-bottom animate-pulse ml-0.5"
            style={{ background: "#c9a84c" }}
          />
        )}
      </div>

      {/* Ask Ben a follow-up */}
      {status === "done" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAsk();
            }}
            placeholder="Ask Ben a follow-up question…"
            className="flex-1 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(245,230,200,0.95)",
              color: "#24130a",
              border: "1px solid rgba(201,168,76,0.5)",
              fontFamily: "EB Garamond, serif",
            }}
          />
          <button
            type="button"
            onClick={() => void handleAsk()}
            disabled={asking || !question.trim()}
            className="rounded-xl px-5 py-3 font-cinzel text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(201,168,76,0.9)", color: "#1a0f0a" }}
          >
            {asking ? "…" : "Ask"}
          </button>
        </div>
      )}

      {/* Re-run button */}
      {(status === "done" || status === "error") && (
        <button
          type="button"
          onClick={() => void streamFrom({ financialContext: context })}
          className="w-full rounded-xl py-2 text-xs font-cinzel uppercase tracking-widest transition-all active:scale-95"
          style={{
            background: "rgba(107,68,35,0.15)",
            border: "1px solid rgba(107,68,35,0.35)",
            color: "#7a5d3a",
          }}
        >
          ↺ Refresh Analysis
        </button>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router   = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [viewMode, setViewMode] = useState<"month" | "cumulative">("month");

  const [spend,            setSpend]            = useState<SpendRow[]>([]);
  const [billsRows,        setBillsRows]        = useState<BillRow[]>([]);
  const [debtRows,         setDebtRows]         = useState<DebtRow[]>([]);
  const [paymentsRows,     setPaymentsRows]     = useState<PaymentRow[]>([]);
  const [monthlyMaster,    setMonthlyMaster]    = useState<BenMasterRow | null>(null);
  const [cumulativeMaster, setCumulativeMaster] = useState<BenMasterRow | null>(null);
  const [profile,          setProfile]          = useState<ProfileRow | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [notice,           setNotice]           = useState("");
  const [showBen,          setShowBen]          = useState(false);

  // ── Data fetch ──
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) { setNotice("Sign in to see your dashboard."); setLoading(false); return; }
      const uid = session.user.id;

      const [spendRes, billsRes, debtsRes, paymentsRes, monthlyRes, cumulativeRes, profileRes] = await Promise.all([
        supabase.from("spend_entries").select("id, amount, category").eq("user_id", uid),
        supabase.from("bills").select("id, name, kind, category, target, monthly_target, balance, min_payment, due_date, due, due_day, focus").eq("user_id", uid),
        supabase.from("debts").select("id, name, kind, balance, min_payment, monthly_min_payment, due_date, due_day, apr").eq("user_id", uid),
        supabase.from("payments").select("id, amount, bill_id, debt_id, date_iso, created_at").eq("user_id", uid),
        supabase.from("ben_master_monthly").select("*").eq("user_id", uid).gte("month", currentMonthStartISO()).order("month", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("ben_master").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("profiles").select("xp, level, reputation").eq("user_id", uid).maybeSingle(),
      ]);

      if (spendRes.error)      setNotice(spendRes.error.message);
      if (billsRes.error)      setNotice(billsRes.error.message);
      if (debtsRes.error)      setNotice(debtsRes.error.message);
      if (paymentsRes.error)   setNotice(paymentsRes.error.message);

      setSpend((spendRes.data        || []) as SpendRow[]);
      setBillsRows((billsRes.data    || []) as BillRow[]);
      setDebtRows((debtsRes.data     || []) as DebtRow[]);
      setPaymentsRows((paymentsRes.data || []) as PaymentRow[]);
      setMonthlyMaster((monthlyRes.data    || null) as BenMasterRow | null);
      setCumulativeMaster((cumulativeRes.data || null) as BenMasterRow | null);
      setProfile((profileRes.data    || null) as ProfileRow | null);
      setLoading(false);
    }
    void loadDashboard();
  }, [supabase]);

  // ── Derived values ──
  const master = viewMode === "month" ? monthlyMaster ?? cumulativeMaster : cumulativeMaster ?? monthlyMaster;

  const totalIncome       = clampMoney(master?.total_income);
  const totalSpend        = clampMoney(master?.total_spend);
  const bills             = clampMoney(master?.bills ?? master?.total_bills);
  const totalDebt         = clampMoney(master?.total_debt);
  const totalDebtMinimums = clampMoney(master?.total_debt_minimums);
  const payments          = clampMoney(master?.payments);
  const net               = clampMoney(master?.leftover);
  const pressurePct       = clampMoney(master?.pressure_pct);
  const totalObligations  = totalSpend + bills + totalDebtMinimums;
  const incomeGap         = Math.max(0, totalObligations - totalIncome);
  const pressureColor     = pressurePct > 75 || incomeGap > 0 ? "#f87171" : pressurePct > 40 ? "#f59e0b" : "#4ade80";

  const reputation = profile?.reputation ?? 0;
  const rank       = getColonialRank(reputation);

  // Financial health score (0–100)
  const healthScore = useMemo(() => {
    let s = 80;
    if (incomeGap > 0)      s -= 35;
    if (pressurePct > 75)   s -= 20;
    else if (pressurePct > 40) s -= 10;
    if (net < 0)            s -= 15;
    if (debtRows.length > 5) s -= 5;
    const highApr = debtRows.filter(d => clampMoney(d.apr) > 20).length;
    s -= highApr * 5;
    const paidCount = billsRows.filter(b => (paymentsRows.filter(p => p.bill_id === b.id).reduce((a, p) => a + clampMoney(p.amount), 0)) >= billAmount(b) && billAmount(b) > 0).length;
    s += paidCount * 3;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [incomeGap, pressurePct, net, debtRows, billsRows, paymentsRows]);

  const spendByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    spend.forEach(row => {
      const cat = (row.category || "misc").replaceAll("_", " ");
      totals[cat] = (totals[cat] || 0) + clampMoney(row.amount);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [spend]);

  const topCategory = spendByCategory[0] ?? null;

  const paidThisMonth = useMemo(() => {
    const monthStart = currentMonthStartISO();
    const byBill: Record<string, number> = {}; const byDebt: Record<string, number> = {};
    paymentsRows.forEach(p => {
      const date = (p.date_iso || p.created_at || "").slice(0, 10);
      if (!date || date < monthStart) return;
      const amt = clampMoney(p.amount);
      if (p.bill_id) byBill[p.bill_id] = (byBill[p.bill_id] || 0) + amt;
      if (p.debt_id) byDebt[p.debt_id] = (byDebt[p.debt_id] || 0) + amt;
    });
    return { byBill, byDebt };
  }, [paymentsRows]);

  const priorityItems = useMemo<PriorityInput[]>(() => [
    ...billsRows.map(bill => {
      const due = billAmount(bill); const paid = paidThisMonth.byBill[bill.id] || 0;
      return { id: bill.id, type: "bill" as const, name: bill.name, amount: Math.max(0, due - paid), due_date: bill.due_date, due: bill.due, due_day: bill.due_day, category: bill.category, kind: bill.kind, focus: bill.focus, is_paid_this_month: paid >= due && due > 0 };
    }),
    ...debtRows.map(debt => {
      const due = debtMin(debt); const paid = paidThisMonth.byDebt[debt.id] || 0;
      return { id: debt.id, type: "debt" as const, name: debt.name, amount: Math.max(0, due - paid), balance: debt.balance, due_date: debt.due_date, due_day: debt.due_day, kind: debt.kind, apr: debt.apr, is_paid_this_month: paid >= due && due > 0 };
    }),
  ], [billsRows, debtRows, paidThisMonth]);

  const topPriorities = useMemo(() =>
    prioritizeMoneyItems(priorityItems).filter(r => !r.item.is_paid_this_month && r.amount > 0).slice(0, 5),
    [priorityItems]);

  const ben = BenEngine.getForecastMessage({
    name: null, timeframeLabel: viewMode === "month" ? "This Month" : "Cumulative",
    totalNeeded: totalObligations, incomeSoFar: totalIncome, incomeGap,
    dailyIncomeNeeded: incomeGap > 0 ? Math.ceil(incomeGap / 30) : 0,
  });

  const priorityBenText = topPriorities.length > 0
    ? `Good Governor, thy first concern is ${topPriorities[0].item.name ?? "an item"} for ${money(topPriorities[0].amount)}. Reason: ${topPriorities[0].reasons.join(", ")}.`
    : ben.text;

  // ── Build OpenAI context string ──
  const aiContext = useMemo(() => {
    if (loading) return "";
    const lines: string[] = [
      `=== FRANKLIN'S LANDING FINANCIAL SNAPSHOT ===`,
      `Monthly Income: ${money(totalIncome)}`,
      `Total Obligations: ${money(totalObligations)} (spend ${money(totalSpend)} + bills ${money(bills)} + debt minimums ${money(totalDebtMinimums)})`,
      `Net Leftover: ${money(net)} ${net < 0 ? "(DEFICIT)" : ""}`,
      `Income Gap: ${money(incomeGap)} ${incomeGap > 0 ? "(OVER BUDGET)" : "(within budget)"}`,
      `Debt Pressure: ${pressurePct > 0 ? `${pressurePct.toFixed(1)}%` : "0%"}`,
      `Financial Health Score: ${healthScore}/100`,
      "",
    ];

    if (debtRows.length > 0) {
      lines.push("DEBTS:");
      debtRows.forEach(d => {
        const bal = clampMoney(d.balance); const apr = clampMoney(d.apr); const min = debtMin(d);
        if (bal > 0) lines.push(`  - ${d.name ?? "Debt"}: $${bal.toFixed(2)} balance, ${apr > 0 ? apr + "% APR" : "no APR"}, $${min}/mo minimum`);
      });
      lines.push("");
    }

    if (billsRows.length > 0) {
      lines.push("BILLS:");
      billsRows.forEach(b => {
        const amt = billAmount(b); const paid = paidThisMonth.byBill[b.id] || 0;
        lines.push(`  - ${b.name ?? "Bill"}: $${amt.toFixed(2)}/mo${paid > 0 ? ` (${money(paid)} paid this month)` : " (unpaid)"}`);
      });
      lines.push("");
    }

    if (spendByCategory.length > 0) {
      lines.push("SPENDING BY CATEGORY:");
      spendByCategory.slice(0, 6).forEach(([cat, val]) => lines.push(`  - ${cat}: ${money(val)}`));
      lines.push("");
    }

    if (topPriorities.length > 0) {
      lines.push("MOST URGENT UNPAID ITEMS:");
      topPriorities.forEach((r, i) => lines.push(`  ${i + 1}. ${r.item.type.toUpperCase()}: ${r.item.name ?? "Unknown"} — ${money(r.amount)} — ${dueLabel(r.daysUntilDue)}`));
    }

    return lines.join("\n");
  }, [loading, totalIncome, totalObligations, totalSpend, bills, totalDebtMinimums, net, incomeGap, pressurePct, healthScore, debtRows, billsRows, spendByCategory, topPriorities, paidThisMonth]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050302" }}>
        <div className="rounded-2xl px-8 py-6 text-center" style={{ background: "rgba(12,6,3,0.95)", border: "1px solid rgba(201,168,76,0.35)" }}>
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>Consulting the Treasury…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#050302,#0c0502 60%,#050302)", fontFamily: "EB Garamond, serif" }}>
      <div className="min-h-screen pb-28 bg-ben-bank bg-cover bg-center bg-fixed" style={{ background: "rgba(8,4,2,0.78)" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">

          {/* ── Hero ────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => router.push("/world")}
                  className="rounded-full px-3 py-1.5 text-xs transition-all active:scale-95"
                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(201,168,76,0.4)", color: "#f5e6c8" }}
                >
                  ← Back to Town
                </button>
                <button
                  type="button"
                  onClick={() => setShowBen(true)}
                  className="rounded-full px-3 py-1.5 text-xs transition-all active:scale-95"
                  style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
                >
                  🪶 Ben's Notice
                </button>
              </div>
              <p className="font-cinzel text-xs uppercase tracking-[0.22em] font-semibold" style={{ color: "#5a4030" }}>AskBen Command Center</p>
              <h1 className="font-cinzel text-3xl font-bold mt-0.5" style={{ color: "#c9a84c" }}>Governor's Office</h1>
              <p className="mt-0.5 text-sm italic" style={{ color: "#7a5d3a" }}>Good morrow, Governor. The Treasury awaits thy guidance.</p>
            </div>

            {/* Reputation badge */}
            <div className="rounded-xl px-5 py-4 text-center shrink-0" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.35)" }}>
              <p className="text-[10px] uppercase tracking-widest font-cinzel" style={{ color: "#7a5d3a" }}>Reputation</p>
              <p className="text-3xl font-bold font-cinzel mt-1" style={{ color: "#c9a84c" }}>{reputation.toLocaleString()}</p>
              <p className="text-xs mt-0.5 font-cinzel" style={{ color: "#e8d5b7" }}>{rank}</p>
            </div>
          </div>

          {/* ── Notice ── */}
          {notice && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)", color: "#c9a84c" }}>
              ✦ {notice}
            </div>
          )}

          {/* ── Key metrics + Health Gauge ── */}
          <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile label="Income"      value={money(totalIncome)}    color="#c9a84c" />
              <Tile label="Obligations" value={money(totalObligations)} color={totalObligations > totalIncome ? "#f87171" : "#f59e0b"} />
              <Tile label="Net"         value={money(net)}            color={net >= 0 ? "#4ade80" : "#f87171"} helper={net >= 0 ? "In the black" : "Deficit"} />
              <Tile label="Pressure"    value={pressurePct > 0 ? `${pressurePct.toFixed(0)}%` : "—"} color={pressureColor} helper="Debt vs income" />
            </div>

            {/* Health Gauge */}
            <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ background: "rgba(12,6,3,0.92)", border: "1px solid rgba(107,68,35,0.4)" }}>
              <p className="font-cinzel text-[10px] uppercase tracking-widest mb-1" style={{ color: "#7a5d3a" }}>Health Score</p>
              <HealthGauge score={healthScore} />
            </div>
          </div>

          {/* ── View toggle ── */}
          <div className="flex justify-end">
            <div className="inline-flex rounded-xl p-1 gap-1" style={{ background: "rgba(107,68,35,0.18)", border: "1px solid rgba(107,68,35,0.35)" }}>
              {(["month", "cumulative"] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)}
                  className="rounded-lg px-4 py-1.5 text-xs font-cinzel font-bold uppercase tracking-wide transition"
                  style={viewMode === mode ? { background: "#c9a84c", color: "#1a0f0a" } : { color: "#7a5d3a" }}>
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* ── Budget visual + Spending bars ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Budget Breakdown" subtitle="Where your income goes this period">
              <BudgetDonut income={totalIncome} spend={totalSpend} bills={bills} debtMins={totalDebtMinimums} net={net} />
            </Card>
            <Card title="Spending by Category" subtitle="Sorted by highest spend">
              <SpendingBars categories={spendByCategory} />
            </Card>
          </div>

          {/* ── AI Advisor ── */}
          <Card title="🪶 Ben's AI Analysis" subtitle="Powered by OpenAI · Personalized to your real numbers" accent>
            <AiAdvisor context={aiContext} />
          </Card>

          {/* ── Ben's Desk (rule-based + XP + Orders) ── */}
          <Card title="Ben's Desk" subtitle="Guidance, XP, and today's command briefing">
            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <BenBubble message={priorityBenText} mood={ben.mood} />
              <div className="rounded-xl p-4" style={{ background: "rgba(107,68,35,0.12)", border: "1px solid rgba(107,68,35,0.35)" }}>
                <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold mb-3" style={{ color: "#7a5d3a" }}>Ben XP</p>
                <XpBar xp={profile?.xp || undefined} level={profile?.level || undefined} />
              </div>
            </div>
            <div className="mt-4"><GovernorsOrders /></div>
          </Card>

          {/* ── Priority Engine ── */}
          <Card title="Priority Engine" subtitle="Unpaid bills & debts ranked by urgency — pay these first">
            <div className="space-y-3">
              {topPriorities.length === 0 ? (
                <div className="rounded-xl px-4 py-6 text-center" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
                  <p className="text-sm font-cinzel" style={{ color: "#4ade80" }}>✦ No unpaid priority items. Nice work, Governor.</p>
                </div>
              ) : (
                topPriorities.map((row, idx) => {
                  const isOverdue = row.daysUntilDue !== null && row.daysUntilDue < 0;
                  const isUrgent  = row.daysUntilDue !== null && row.daysUntilDue <= 3;
                  const borderC   = isOverdue ? "rgba(248,113,113,0.5)" : isUrgent ? "rgba(245,158,11,0.45)" : "rgba(107,68,35,0.38)";
                  return (
                    <div key={`${row.item.type}-${row.item.id}`} className="rounded-xl p-4" style={{ background: "rgba(10,5,2,0.7)", border: `1px solid ${borderC}` }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-cinzel font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(107,68,35,0.28)", color: "#7a5d3a" }}>
                              #{idx + 1} {row.item.type}
                            </span>
                            {isOverdue && <span className="text-[10px] font-cinzel font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.14)", color: "#f87171" }}>OVERDUE</span>}
                          </div>
                          <h3 className="font-cinzel text-base font-bold truncate" style={{ color: "#e8d5b7" }}>{row.item.name ?? "Unnamed"}</h3>
                          <p className="text-xs mt-0.5" style={{ color: isOverdue ? "#f87171" : isUrgent ? "#f59e0b" : "#7a5d3a" }}>{dueLabel(row.daysUntilDue)}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {row.reasons.map(r => <span key={r} className="text-[10px] rounded-full px-2 py-0.5" style={{ background: "rgba(107,68,35,0.18)", border: "1px solid rgba(107,68,35,0.28)", color: "#7a5d3a" }}>{r}</span>)}
                          </div>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <p className="font-cinzel text-xl font-bold" style={{ color: "#c9a84c" }}>{money(row.amount)}</p>
                          <p className="text-[11px] font-cinzel" style={{ color: "#5a4030" }}>Score {row.score}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* ── Debt Payoff Scenarios ── */}
          <Card title="Debt Payoff Scenarios" subtitle="Avalanche method — highest APR first. What paying $75 extra achieves.">
            <DebtScenarios debts={debtRows} />
          </Card>

          {/* ── Obligations Ledger ── */}
          <Card title="Obligations Ledger" subtitle="Bills, debt minimums, and payments recorded">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Tile label="Bills"          value={money(bills)}             helper="Bill targets this period" />
              <Tile label="Debt Minimums"  value={money(totalDebtMinimums)} helper="Required payments" />
              <Tile label="Payments Made"  value={money(payments)}          helper="Actual payments recorded" color={payments >= totalDebtMinimums && payments > 0 ? "#4ade80" : "#c9a84c"} />
            </div>
          </Card>

          {/* ── Quote ── */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3" style={{ background: "rgba(245,230,200,0.04)", border: "1px solid rgba(201,168,76,0.18)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              "An investment in knowledge pays the best interest." — Benjamin Franklin
            </p>
          </div>

        </div>
      </div>

      {/* ── Ben's Notice modal ── */}
      {showBen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.84)" }} onClick={() => setShowBen(false)}>
          <div className="w-full max-w-md rounded-3xl p-6" style={{ background: "linear-gradient(180deg,#130a04,#080402)", border: "1px solid rgba(201,168,76,0.45)" }} onClick={(e) => e.stopPropagation()}>
            <p className="font-cinzel mb-4 text-xs uppercase tracking-widest" style={{ color: "#c9a84c" }}>Ben's Notice</p>
            <BenBubble message={priorityBenText} mood={ben.mood} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm" style={{ color: "#9a7d5a" }}>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(107,68,35,0.12)", border: "1px solid rgba(107,68,35,0.28)" }}>
                <div className="font-cinzel text-xs mb-1">Top Spend</div>
                <div className="font-bold" style={{ color: "#c9a84c" }}>{topCategory ? topCategory[0] : "—"}</div>
                {topCategory && <div className="text-xs">{money(topCategory[1])}</div>}
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(107,68,35,0.12)", border: "1px solid rgba(107,68,35,0.28)" }}>
                <div className="font-cinzel text-xs mb-1">Total Debt</div>
                <div className="font-bold" style={{ color: totalDebt > 0 ? "#f87171" : "#4ade80" }}>{money(totalDebt)}</div>
                <div className="text-xs">{debtRows.length} account{debtRows.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <button type="button" onClick={() => setShowBen(false)} className="mt-5 w-full rounded-2xl py-3 font-cinzel text-sm font-bold uppercase tracking-widest transition-all active:scale-95" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
