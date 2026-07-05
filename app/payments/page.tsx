"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";
import { clampMoney, money } from "@/lib/money/math";
import { todayISO } from "@/lib/money/utils";
import { currentMonthStartISO } from "@/lib/money/dates";
import { playError, playCashRegister } from "@/lib/sounds";

const INCOME_BG = "/rooms/bank-room.webp";

type IncomeRow = {
  id: string;
  user_id: string;
  source_name: string | null;
  amount: number | string | null;
  date_iso: string;
  note: string | null;
  created_at: string;
};

export default function IncomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err" | "info">("ok");

  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("Employment");
  const [hours, setHours] = useState("");
  const [dateISO, setDateISO] = useState(todayISO());
  const [note, setNote] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  function notify(msg: string, type: "ok" | "err" | "info" = "ok") {
    setMessage(msg);
    setMsgType(type);
    window.setTimeout(() => setMessage(""), 4500);
  }

  async function loadIncome(uid: string) {
    const { data, error } = await supabase
      .from("income_entries")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      notify(error.message, "err");
      return;
    }

    setIncome(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        notify(error.message, "err");
        setLoading(false);
        return;
      }

      const user = data.session?.user;

      if (!user) {
        notify("Sign in to record income.", "info");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadIncome(user.id);
      setLoading(false);
    }

    void init();
  }, [supabase]);

  async function handleScanIncome() {
    if (!imageFile) return;

    setScanning(true);
    notify("Ben is reading the income proof.", "info");

    try {
      const { text } = await ocrImageFile(imageFile);
      const first = parseTransactionsScreenshot(text)[0];

      if (!first) {
        notify("No clear income found. Fill it in manually.", "info");
        setScanning(false);
        return;
      }

      setSource(first.merchant || "");
      if (first.amount) setAmount(String(first.amount));

      if (first.dateText && /^\d{4}-\d{2}-\d{2}$/.test(first.dateText)) {
        setDateISO(first.dateText);
      }

      setNote("Scanned income proof");
      notify("Scanner filled what it could. Review before saving.", "info");
    } catch {
      notify("Scanner had trouble. Manual entry still works.", "err");
    }

    setScanning(false);
  }

  async function handleSaveIncome() {
    if (!userId) return;

    const amt = clampMoney(amount);

    if (amt <= 0) {
      playError();
      notify("Enter an income amount.", "err");
      return;
    }

    if (!source.trim()) {
      playError();
      notify("Enter who paid you or the income source.", "err");
      return;
    }

    setSaving(true);

    const finalNote = [
      note.trim(),
      category ? `Category: ${category}` : "",
      hours ? `Hours: ${hours}` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    const { error } = await supabase.from("income_entries").insert({
      user_id: userId,
      source_name: source.trim(),
      amount: amt,
      date_iso: dateISO,
      note: finalNote || null,
    });

    if (error) {
      playError();
      notify(error.message, "err");
      setSaving(false);
      return;
    }

    playCashRegister();
    notify("Income recorded. Ben stamped the ledger.", "ok");

    setAmount("");
    setSource("");
    setCategory("Employment");
    setHours("");
    setDateISO(todayISO());
    setNote("");
    setImageFile(null);

    await loadIncome(userId);
    setSaving(false);
  }

  const currentMonthStart = currentMonthStartISO();

  const monthlyIncome = useMemo(
    () =>
      income.filter(
        (row) =>
          (row.date_iso || row.created_at || "").slice(0, 10) >= currentMonthStart
      ),
    [income, currentMonthStart]
  );

  const monthlyTotal = useMemo(
    () => monthlyIncome.reduce((sum, row) => sum + clampMoney(row.amount), 0),
    [monthlyIncome]
  );

  const allTimeTotal = useMemo(
    () => income.reduce((sum, row) => sum + clampMoney(row.amount), 0),
    [income]
  );

  const uniqueSources = useMemo(() => {
    const names = new Set(
      income.map((row) => row.source_name || "Income").filter(Boolean)
    );
    return names.size;
  }, [income]);

  const latestIncome = income[0];

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Income",
    totalNeeded: monthlyTotal,
    incomeSoFar: monthlyTotal,
    incomeGap: 0,
    dailyIncomeNeeded: 0,
  });

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-black text-[#f5e6c8]">
        <div className="rounded-3xl border border-[#c9a84c]/40 bg-black/80 px-8 py-6">
          Ben is opening the income ledger...
        </div>
      </main>
    );
  }

  return (
    <main className="income-page">
      <section className="hero">
        <div className="hero-frame">
          <img src={INCOME_BG} alt="Ben at the bank desk" className="hero-img" />
          <div className="hero-shade" />

          <div className="hero-top">
            <Link href="/world" className="back-btn">
              ← Back to Town
            </Link>
          </div>

          <div className="hero-title">
            <p className="eyebrow">Franklin’s Bank</p>
            <h1>Income Ledger</h1>
            <p className="hero-sub">
              Record income, scan proof, and let Ben turn every dollar into town progress.
            </p>
          </div>
        </div>
      </section>

      <div className="desk-content">
        <div className="action-grid">
          <Link href="/income" className="action-btn green">
            + Record Income
          </Link>

          <Link href="/income-plan" className="action-btn gold">
            📜 Income Plan
          </Link>

          <Link href="/crisis" className="action-btn red">
            🚨 Need Money Fast
          </Link>
        </div>

        <div className="stats-grid">
          <MetricTile
            icon="🪙"
            label="Income This Month"
            value={money(monthlyTotal)}
            helper={`${monthlyIncome.length} entries`}
          />
          <MetricTile
            icon="📜"
            label="All-Time Income"
            value={money(allTimeTotal)}
            helper={`${income.length} ledger entries`}
          />
          <MetricTile
            icon="🏦"
            label="Income Sources"
            value={String(uniqueSources)}
            helper="tracked sources"
          />
          <MetricTile
            icon="✨"
            label="Latest"
            value={latestIncome ? money(latestIncome.amount) : "$0.00"}
            helper={latestIncome?.source_name || "No income yet"}
          />
        </div>

        {message && <div className={`notice ${msgType}`}>{message}</div>}

        <ColonialCard>
          <h2>Ben’s Income Briefing</h2>
          <p className="card-sub">A word from the desk before the ledger opens.</p>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </ColonialCard>

        <div className="work-grid">
          <ColonialCard>
            <h2>Record Income</h2>
            <p className="card-sub">Earn it, name it, and put it in the ledger.</p>

            <div className="form-grid">
              <Field label="Amount">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Paid By / Source">
                <input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="DoorDash, employer, client..."
                />
              </Field>

              <Field label="Category">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option>Employment</option>
                  <option>Side Hustle</option>
                  <option>DoorDash</option>
                  <option>Client</option>
                  <option>Cash</option>
                  <option>Refund</option>
                  <option>Other</option>
                </select>
              </Field>

              <Field label="Hours Worked">
                <input
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  placeholder="Optional"
                  inputMode="decimal"
                />
              </Field>

              <Field label="Date" full>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(event) => setDateISO(event.target.value)}
                />
              </Field>

              <Field label="Note" full>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Optional note..."
                />
              </Field>

              <button
                onClick={handleSaveIncome}
                disabled={saving}
                className="save-btn"
              >
                {saving ? "Saving..." : "Save Income"}
              </button>
            </div>
          </ColonialCard>

          <ColonialCard>
            <h2>Scan Income Proof</h2>
            <p className="card-sub">
              Upload a DoorDash screenshot, paycheck, deposit, or receipt.
            </p>

            <PaperScrollScanner
              title="Scan Income Proof"
              description="Upload income proof. Ben will fill what he can, and you approve the ledger."
              file={imageFile}
              busy={scanning}
              onFileChange={setImageFile}
              onScan={() => void handleScanIncome()}
            />
          </ColonialCard>
        </div>

        <ColonialCard>
          <h2>Recent Income</h2>
          <p className="card-sub">
            {latestIncome
              ? `${latestIncome.source_name || "Latest"} — ${money(latestIncome.amount)}`
              : "The ledger awaits its first income entry."}
          </p>

          <div className="ledger-list">
            {income.length === 0 ? (
              <div className="empty-ledger">No income yet. The bank ledger is ready.</div>
            ) : (
              income.map((row) => {
                const isThisMonth =
                  (row.date_iso || "").slice(0, 7) >= currentMonthStart.slice(0, 7);

                return (
                  <div key={row.id} className="ledger-row">
                    <div>
                      <div className="ledger-title">
                        <strong>{row.source_name || "Income"}</strong>
                        {isThisMonth && <span className="green">This month</span>}
                      </div>
                      <div className="ledger-meta">
                        {row.date_iso}
                        {row.note ? ` • ${row.note}` : ""}
                      </div>
                    </div>

                    <strong className="ledger-amount">{money(row.amount)}</strong>
                  </div>
                );
              })
            )}
          </div>
        </ColonialCard>

        <div className="quote">
          “An investment in knowledge pays the best interest.” — Benjamin Franklin
        </div>
      </div>

      <style jsx>{`
        .income-page {
          min-height: 100vh;
          padding-top: 250px;
          padding-bottom: 100px;
          background:
            radial-gradient(circle at top, rgba(245, 196, 88, 0.12), transparent 32rem),
            linear-gradient(180deg, #050302, #140a04 45%, #050302);
          color: #fff7ed;
        }

        .hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px;
        }

        .hero-frame {
          position: relative;
          width: 100%;
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid rgba(201, 168, 76, 0.35);
          background: #050302;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.65);
        }

        .hero-img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 620px;
          object-fit: contain;
          object-position: center;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(5, 3, 2, 0.05), rgba(5, 3, 2, 0.16) 45%, rgba(5, 3, 2, 0.82)),
            linear-gradient(90deg, rgba(5, 3, 2, 0.55), transparent 45%, rgba(5, 3, 2, 0.35));
        }

        .hero-top {
          position: absolute;
          top: 18px;
          left: 18px;
          z-index: 2;
        }

        .back-btn {
          display: inline-flex;
          color: #f5e6c8;
          text-decoration: none;
          border: 1px solid rgba(201, 168, 76, 0.4);
          background: rgba(0, 0, 0, 0.62);
          border-radius: 999px;
          padding: 10px 16px;
        }

        .hero-title {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 22px;
          z-index: 2;
          max-width: 660px;
        }

        .eyebrow {
          color: #facc15;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 900;
          font-size: 13px;
          margin: 0 0 8px;
        }

        h1 {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(48px, 8vw, 88px);
          line-height: 0.88;
          margin: 0;
          text-shadow: 0 8px 28px rgba(0, 0, 0, 0.9);
        }

        .hero-sub {
          max-width: 620px;
          font-size: 19px;
          line-height: 1.35;
          color: #ead9bd;
          margin: 12px 0 0;
        }

        .desk-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 18px 18px;
          display: grid;
          gap: 18px;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 76px;
          border-radius: 26px;
          text-decoration: none;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 30px;
          font-weight: 800;
          border: 1px solid rgba(201, 168, 76, 0.35);
        }

        .action-btn.green {
          background: rgba(22, 101, 52, 0.95);
          color: #f5e6c8;
          border-color: rgba(74, 222, 128, 0.75);
        }

        .action-btn.gold {
          background: rgba(0, 0, 0, 0.7);
          color: #f5e6c8;
        }

        .action-btn.red {
          background: rgba(69, 10, 10, 0.82);
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.55);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .notice {
          border-radius: 20px;
          padding: 14px 16px;
          border: 1px solid rgba(201, 168, 76, 0.35);
          background: rgba(15, 8, 4, 0.9);
          color: #facc15;
        }

        .notice.err {
          color: #fb7185;
          border-color: rgba(251, 113, 133, 0.5);
        }

        .notice.info {
          color: #93c5fd;
          border-color: rgba(147, 197, 253, 0.5);
        }

        .work-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
          gap: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field.full,
        .save-btn {
          grid-column: 1 / -1;
        }

        label {
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

        .save-btn:disabled {
          opacity: 0.6;
        }

        .ledger-list {
          display: grid;
          gap: 10px;
        }

        .empty-ledger,
        .ledger-row {
          border-radius: 18px;
          border: 1px solid rgba(201, 168, 76, 0.18);
          background: rgba(255, 255, 255, 0.04);
          padding: 16px;
        }

        .ledger-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .ledger-title {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ledger-title strong {
          color: #f5e6c8;
        }

        .ledger-title span {
          color: #4ade80;
          font-size: 12px;
          border: 1px solid rgba(74, 222, 128, 0.28);
          border-radius: 999px;
          padding: 3px 8px;
        }

        .ledger-meta {
          color: #b99b60;
          font-size: 13px;
          margin-top: 5px;
        }

        .ledger-amount {
          color: #4ade80;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 24px;
          white-space: nowrap;
        }

        .quote {
          text-align: center;
          color: #d6c09a;
          font-style: italic;
          padding: 18px;
        }

        @media (max-width: 900px) {
          .action-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .work-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .income-page {
            padding-top: 250px;
          }

          .hero {
            padding: 12px;
          }

          .hero-frame {
            border-radius: 24px;
          }

          .hero-img {
            max-height: 420px;
          }

          .hero-top {
            top: 12px;
            left: 12px;
          }

          .back-btn {
            padding: 8px 13px;
            font-size: 14px;
          }

          .hero-title {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }

          h1 {
            font-size: 46px;
          }

          .hero-sub {
            font-size: 16px;
          }

          .stats-grid,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .action-btn {
            min-height: 72px;
            font-size: 28px;
          }

          .ledger-row {
            flex-direction: column;
          }

          .ledger-amount {
            align-self: flex-end;
          }
        }
      `}</style>
    </main>
  );
}

function ColonialCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="colonial-card">
      {children}

      <style jsx>{`
        .colonial-card {
          border-radius: 28px;
          padding: 22px;
          background: linear-gradient(
            180deg,
            rgba(18, 10, 4, 0.94),
            rgba(5, 3, 2, 0.97)
          );
          border: 1px solid rgba(201, 168, 76, 0.34);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
        }

        h2 {
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
      `}</style>
    </section>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "field full" : "field"}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  helper,
}: {
  icon: string;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="metric-tile">
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {helper && <div className="metric-helper">{helper}</div>}

      <style jsx>{`
        .metric-tile {
          border-radius: 24px;
          padding: 18px;
          background: linear-gradient(
            180deg,
            rgba(18, 10, 4, 0.94),
            rgba(5, 3, 2, 0.97)
          );
          border: 1px solid rgba(201, 168, 76, 0.32);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.42);
        }

        .metric-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .metric-label {
          color: #b99b60;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .metric-value {
          color: #4ade80;
          font-size: 30px;
          font-weight: 900;
          margin-top: 6px;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .metric-helper {
          color: #d6c09a;
          font-size: 13px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
