"use client";

import { useEffect, useMemo, useState } from "react";
import BankHero from "@/components/income/BankHero";
import RoomCard from "@/components/income/RoomCard";
import MiniMetric from "@/components/income/MiniMetric";
import DrawerButton from "@/components/income/DrawerButton";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";
import { money, addMoney, clampMoney } from "@/lib/money/math";
import { todayLocalISO, currentMonthStartISO } from "@/lib/money/dates";
import { BenEngine } from "@/lib/ben/engine";
import { playCoins, playError } from "@/lib/sounds";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type IncomeEntry = {
  id: string;
  user_id: string;
  source_name: string;
  amount: number | string | null;
  date_iso: string;
  note: string | null;
  created_at: string;
};
type Drawer = "record" | "scan" | "plan" | null;

const CATEGORIES = [
  { value: "employment", label: "Employment", icon: "🏛" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "⚙️" },
  { value: "services", label: "Services", icon: "📋" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "gifts", label: "Gifts", icon: "🎁" },
  { value: "other", label: "Other", icon: "💰" },
];

function entryDate(entry: IncomeEntry) {
  return (entry.date_iso || entry.created_at || "").slice(0, 10);
}
function monthPrefix(date: string) {
  return date.slice(0, 7);
}

export default function IncomePage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [message, setMessage] = useState("");

  const [drawer, setDrawer] = useState<Drawer>("record");

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("employment");
  const [hoursWorked, setHoursWorked] = useState("");
  const [date, setDate] = useState(todayLocalISO());

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("income_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);

    setEntries((data || []) as IncomeEntry[]);
    setLoading(false);
  }

  async function handleScanIncome() {
    if (!imageFile) {
      setMessage("Choose an income screenshot or deposit proof first.");
      return;
    }

    setScanning(true);
    setMessage("Ben is reading the income proof…");

    try {
      const { text } = await ocrImageFile(imageFile);
      const first = parseTransactionsScreenshot(text)[0];

      if (!first) {
        setMessage("No clear income found. Fill it in manually.");
        setScanning(false);
        return;
      }

      setSource(first.merchant || "");
      if (first.amount) setAmount(String(first.amount));

      if (first.dateText && /^\d{4}-\d{2}-\d{2}$/.test(first.dateText)) {
        setDate(first.dateText);
      }

      setDrawer("record");
      setMessage("Scanner filled what it could. Review before saving.");
    } catch {
      setMessage("Scanner had trouble. Manual entry still works.");
    }

    setScanning(false);
  }

async function handleAddIncome() {
  setMessage("");

  const amt = clampMoney(amount);

  if (amt <= 0) {
    playError();
    setMessage("Enter a valid income amount.");
    return;
  }

  if (!source.trim()) {
    playError();
    setMessage("Enter who paid you or the income source.");
    return;
  }

  if (!userId) {
    playError();
    setMessage("Not signed in.");
    return;
  }

  setSaving(true);

  const incomeNote = [
    category ? `Category: ${category}` : "",
    hoursWorked ? `Hours: ${hoursWorked}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const { error } = await supabase.from("income_entries").insert({
    user_id: userId,
    source_name: source.trim(),
    amount: amt,
    date_iso: date,
    note: incomeNote || null,
  });

  setSaving(false);

  if (error) {
    playError();
    setMessage(error.message);
    return;
  }

  playCoins();
  setAmount("");
  setSource("");
  setHoursWorked("");
  setImageFile(null);
  setDrawer(null);
  setMessage("Income recorded in Franklin’s ledger.");
  await loadData();
}

  const thisMonth = monthPrefix(currentMonthStartISO());

  const thisMonthTotal = useMemo(
    () =>
      addMoney(
        entries
          .filter((entry) => monthPrefix(entryDate(entry)) === thisMonth)
          .map((entry) => entry.amount)
      ),
    [entries, thisMonth]
  );

  const allTimeTotal = useMemo(
    () => addMoney(entries.map((entry) => entry.amount)),
    [entries]
  );

  const avgMonthly = useMemo(() => {
    if (!entries.length) return 0;
    const months = new Set(entries.map((entry) => monthPrefix(entryDate(entry))));
    return clampMoney(allTimeTotal / Math.max(months.size, 1));
  }, [entries, allTimeTotal]);

const sourcesCount = useMemo(
  () => new Set(entries.map((entry) => entry.source_name || "other")).size,
  [entries]
);

  const avgHourly = useMemo(() => {
    const hourly = entries
      .map((entry) => ({
        amount: clampMoney(entry.amount),
        hours: clampMoney(entry.hours_worked),
      }))
      .filter((entry) => entry.amount > 0 && entry.hours > 0);

    const totalAmount = addMoney(hourly.map((entry) => entry.amount));
    const totalHours = addMoney(hourly.map((entry) => entry.hours));

    return totalHours > 0 ? clampMoney(totalAmount / totalHours) : 0;
  }, [entries]);

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const [year, month] = thisMonth.split("-").map(Number);
      const rawMonth = month - (5 - index);
      const adjustedMonth = ((rawMonth - 1 + 12) % 12) + 1;
      const adjustedYear = year + Math.floor((rawMonth - 1) / 12);
      const key = `${adjustedYear}-${String(adjustedMonth).padStart(2, "0")}`;

      return {
        month: new Date(adjustedYear, adjustedMonth - 1, 1).toLocaleDateString(
          "en-US",
          { month: "short" }
        ),
        total: addMoney(
          entries
            .filter((entry) => monthPrefix(entryDate(entry)) === key)
            .map((entry) => entry.amount)
        ),
        current: index === 5,
      };
    });
  }, [entries, thisMonth]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Income Room",
    totalNeeded: thisMonthTotal,
    incomeSoFar: thisMonthTotal,
    incomeGap: 0,
    dailyIncomeNeeded: 0,
  });

  if (loading) {
    return (
      <main className="bank-page loading-room">
        <p>Opening Franklin&apos;s Bank…</p>
      </main>
    );
  }

  return (
    <main className="bank-page">
      <BankHero />

      <section className="desk-wrap">
        {message && <div className="notice">{message}</div>}

        <div className="stats-grid">
          <MiniMetric icon="🪙" label="This Month" value={money(thisMonthTotal)} good />
          <MiniMetric icon="🏦" label="All Time" value={money(allTimeTotal)} />
          <MiniMetric icon="⏱️" label="Avg Hourly" value={avgHourly > 0 ? money(avgHourly) : "—"} />
          <MiniMetric icon="👥" label="Sources" value={String(sourcesCount)} />
        </div>

        <RoomCard>
          <h2>Ben&apos;s Bank Briefing</h2>
          <p className="card-sub">A word from the desk before the ledger opens.</p>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </RoomCard>

        <div className="drawer-buttons">
          <DrawerButton
            active={drawer === "record"}
            onClick={() => setDrawer(drawer === "record" ? null : "record")}
          >
            + Record Income
          </DrawerButton>

          <DrawerButton
            active={drawer === "scan"}
            onClick={() => setDrawer(drawer === "scan" ? null : "scan")}
          >
            📸 Scan Deposit
          </DrawerButton>

          <DrawerButton
            active={drawer === "plan"}
            onClick={() => setDrawer(drawer === "plan" ? null : "plan")}
          >
            📜 Income Plan
          </DrawerButton>

          <DrawerButton
            danger
            onClick={() => setDrawer("plan")}
          >
            🚨 Need Money Fast
          </DrawerButton>
        </div>

        {drawer === "record" && (
          <RoomCard className="drawer-panel">
            <h2>Record Income</h2>
            <p className="card-sub">Earn it, name it, and put it in Franklin&apos;s ledger.</p>

            <div className="form-grid">
              <label>
                <span>Amount</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label>
                <span>Paid By / Source</span>
                <input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="DoorDash, employer, client..."
                />
              </label>

              <label>
                <span>Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Hours Worked</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={hoursWorked}
                  onChange={(event) => setHoursWorked(event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>

              <button
                onClick={handleAddIncome}
                disabled={saving}
                className="save-btn"
              >
                {saving ? "Recording…" : "💰 Save Income"}
              </button>
            </div>
          </RoomCard>
        )}

        {drawer === "scan" && (
          <RoomCard className="drawer-panel">
            <h2>Scan Income Proof</h2>
            <p className="card-sub">
              Upload a DoorDash screenshot, paycheck, deposit, or income proof.
            </p>

            <PaperScrollScanner
              title="Scan Income Proof"
              description="Ben will fill what he can. Review it before saving."
              file={imageFile}
              busy={scanning}
              onFileChange={setImageFile}
              onScan={() => void handleScanIncome()}
            />
          </RoomCard>
        )}

        {drawer === "plan" && (
          <RoomCard className="drawer-panel">
            <h2>Income Plan</h2>
            <p className="card-sub">
              Need money fast? Start with one clear income target today.
            </p>

            <div className="plan-grid">
              <MiniMetric icon="☀️" label="Today Goal" value={money(Math.max(50, thisMonthTotal / 10))} />
              <MiniMetric icon="🗓️" label="Weekly Goal" value={money(Math.max(250, thisMonthTotal / 4))} />
              <MiniMetric icon="💇‍♀️" label="Service Idea" value="$75+" />
              <MiniMetric icon="🚗" label="Dash Shift" value="$60+" />
            </div>

            <p className="plan-note">
              Ben says: choose the fastest ethical earning path first — one shift,
              one service, one sale, or one client.
            </p>
          </RoomCard>
        )}

        <RoomCard>
          <div className="chart-grid">
            <div>
              <h2>Income This Month</h2>
              <p className="big-money">{money(thisMonthTotal)}</p>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: "#d6c09a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#d6c09a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#130c06",
                        border: "1px solid #6b4423",
                        borderRadius: 8,
                        color: "#e8d5b7",
                      }}
                      formatter={(value: number) => [money(value), "Income"]}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.current ? "#c9a84c" : "#4a5568"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mini-grid">
              <MiniMetric icon="📈" label="Average Month" value={money(avgMonthly)} />
              <MiniMetric icon="📜" label="Entries" value={String(entries.length)} />
            </div>
          </div>
        </RoomCard>

        <RoomCard>
          <h2>Recent Income</h2>

          <div className="recent-list">
            {entries.slice(0, 8).length === 0 ? (
              <p className="empty">No income entries yet.</p>
            ) : (
              entries.slice(0, 8).map((entry) => {
                const cat =
                  CATEGORIES.find((item) => item.value === entry.category) ??
                  CATEGORIES[5];

                return (
                  <div key={entry.id} className="recent-row">
                    <div className="recent-left">
                      <span>{cat.icon}</span>
                      <div>
                        <strong>{entry.source || cat.label}</strong>
                        <p>{entryDate(entry)}</p>
                      </div>
                    </div>

                    <strong className="amount">{money(entry.amount)}</strong>
                  </div>
                );
              })
            )}
          </div>
        </RoomCard>

        <p className="quote">
          “Diligence is the mother of good luck.” — Benjamin Franklin
        </p>
      </section>

      <style jsx global>{`
        .bank-page {
          min-height: 100vh;
          padding-top: 250px;
          padding-bottom: 100px;
          background:
            radial-gradient(circle at top, rgba(245, 196, 88, 0.12), transparent 32rem),
            linear-gradient(180deg, #050302, #140a04 45%, #050302);
          color: #fff7ed;
          font-family: var(--font-inter), system-ui, sans-serif;
        }

        .loading-room {
          display: grid;
          place-items: center;
          color: #c9a84c;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 22px;
        }

        .bank-hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px;
        }

        .bank-hero-frame {
          position: relative;
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid rgba(201, 168, 76, 0.35);
          background: #050302;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.65);
        }

        .bank-hero-img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 620px;
          object-fit: contain;
        }

        .bank-hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(5, 3, 2, 0.04), rgba(5, 3, 2, 0.14) 48%, rgba(5, 3, 2, 0.84)),
            linear-gradient(90deg, rgba(5, 3, 2, 0.58), transparent 48%, rgba(5, 3, 2, 0.38));
        }

        .bank-back-btn {
          position: absolute;
          top: 18px;
          left: 18px;
          z-index: 3;
          color: #f5e6c8;
          text-decoration: none;
          border: 1px solid rgba(201, 168, 76, 0.42);
          background: rgba(0, 0, 0, 0.64);
          border-radius: 999px;
          padding: 10px 16px;
        }

        .bank-hero-title {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 22px;
          z-index: 3;
          max-width: 680px;
        }

        .bank-eyebrow {
          margin: 0 0 8px;
          color: #facc15;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 900;
          font-size: 13px;
        }

        .bank-hero-title h1 {
          margin: 0;
          font-size: clamp(48px, 8vw, 88px);
          line-height: 0.88;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .bank-hero-title p:not(.bank-eyebrow) {
          max-width: 620px;
          margin: 12px 0 0;
          color: #ead9bd;
          font-size: 19px;
        }

        .desk-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 18px 18px;
          display: grid;
          gap: 18px;
        }

        .notice {
          border-radius: 20px;
          padding: 14px 16px;
          color: #facc15;
          background: rgba(15, 8, 4, 0.92);
          border: 1px solid rgba(201, 168, 76, 0.35);
          text-align: center;
        }

        .stats-grid,
        .drawer-buttons,
        .form-grid,
        .chart-grid,
        .plan-grid {
          display: grid;
          gap: 14px;
        }

        .stats-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .drawer-buttons {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .income-room-card {
          border-radius: 28px;
          padding: 22px;
          background: linear-gradient(180deg, rgba(18, 10, 4, 0.94), rgba(5, 3, 2, 0.97));
          border: 1px solid rgba(201, 168, 76, 0.34);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
        }

        .income-room-card h2 {
          margin: 0;
          color: #f5e6c8;
          font-size: 30px;
          line-height: 1;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .card-sub {
          color: #b99b60;
          margin: 8px 0 18px;
        }

        .income-drawer-button {
          min-height: 76px;
          border-radius: 26px;
          border: 1px solid rgba(201, 168, 76, 0.36);
          background: rgba(0, 0, 0, 0.68);
          color: #f5e6c8;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 23px;
          font-weight: 900;
        }

        .income-drawer-button.active {
          background: rgba(22, 101, 52, 0.95);
          border-color: rgba(74, 222, 128, 0.7);
        }

        .income-drawer-button.danger {
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.55);
        }

        .drawer-panel {
          animation: drawerOpen 0.24s ease-out both;
        }

        @keyframes drawerOpen {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        label span {
          display: block;
          color: #d6c09a;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 900;
          margin-bottom: 7px;
        }

        input,
        select,
        textarea {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(201, 168, 76, 0.45);
          background: rgba(255, 245, 220, 0.95);
          color: #24130a;
          padding: 13px 14px;
          font-size: 16px;
          outline: none;
        }

        .save-btn {
          border: 1px solid rgba(74, 222, 128, 0.65);
          border-radius: 20px;
          padding: 16px 18px;
          background: linear-gradient(180deg, #16a34a, #15803d);
          color: #f0fdf4;
          font-size: 18px;
          font-weight: 900;
        }

        .income-mini-metric {
          border-radius: 22px;
          padding: 16px;
          text-align: center;
          background: rgba(0, 0, 0, 0.58);
          border: 1px solid rgba(201, 168, 76, 0.25);
        }

        .income-mini-icon {
          font-size: 27px;
          margin-bottom: 6px;
        }

        .income-mini-label {
          color: #d6c09a;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
          margin: 0;
        }

        .income-mini-value {
          color: #c9a84c;
          font-size: 22px;
          font-weight: 900;
          margin: 6px 0 0;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .income-mini-value.good {
          color: #4ade80;
        }

        .income-mini-value.danger {
          color: #f87171;
        }

        .chart-grid {
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
        }

        .mini-grid,
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .big-money {
          color: #4ade80;
          font-size: 46px;
          font-weight: 900;
          margin: 10px 0 0;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .chart-box {
          height: 190px;
          margin-top: 18px;
        }

        .plan-note {
          margin-top: 16px;
          color: #e8d5b7;
        }

        .recent-list {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .recent-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-radius: 18px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(201, 168, 76, 0.18);
        }

        .recent-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .recent-left span {
          font-size: 24px;
        }

        .recent-left strong {
          color: #f5e6c8;
        }

        .recent-left p {
          margin: 3px 0 0;
          color: #9a7d5a;
          font-size: 13px;
        }

        .recent-row .amount {
          color: #4ade80;
          font-size: 22px;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .empty {
          text-align: center;
          color: #9a7d5a;
        }

        .quote {
          text-align: center;
          color: #c9a84c;
          font-style: italic;
          padding: 18px;
        }

        @media (max-width: 900px) {
          .stats-grid,
          .drawer-buttons,
          .chart-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .bank-page {
            padding-top: 250px;
          }

          .bank-hero {
            padding: 12px;
          }

          .bank-hero-frame {
            border-radius: 24px;
          }

          .bank-hero-img {
            max-height: 420px;
          }

          .bank-back-btn {
            top: 12px;
            left: 12px;
            padding: 8px 13px;
            font-size: 14px;
          }

          .bank-hero-title {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }

          .bank-hero-title h1 {
            font-size: 46px;
          }

          .bank-hero-title p:not(.bank-eyebrow) {
            font-size: 16px;
          }

          .stats-grid,
          .drawer-buttons,
          .form-grid,
          .chart-grid,
          .mini-grid,
          .plan-grid {
            grid-template-columns: 1fr;
          }

          .recent-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .recent-row .amount {
            align-self: flex-end;
          }
        }
      `}</style>
    </main>
  );
}
