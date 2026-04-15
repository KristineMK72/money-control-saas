"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* -------------------- Types -------------------- */

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  due_date: string | null;
  apr: number | null;
  credit_limit: number | null;
  note: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | null;
  created_at: string;
};

/* -------------------- Helpers -------------------- */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* -------------------- Chart -------------------- */

function DonutChart({
  values,
  size = 180,
  stroke = 20,
}: {
  values: { label: string; value: number }[];
  size?: number;
  stroke?: number;
}) {
  const total = values.reduce((sum, v) => sum + v.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const colors = ["#06b6d4", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

  let acc = 0;

  return (
    <svg width={size} height={size}>
      {/* base ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
      />

      {values.map((v, i) => {
        const frac = total ? v.value / total : 0;
        const dash = frac * c;
        const gap = c - dash;
        const offset = -acc * c;
        acc += frac;

        return (
          <circle
            key={v.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}

      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        fontSize={18}
        fontWeight={800}
      >
        ${total.toFixed(0)}
      </text>
    </svg>
  );
}

/* -------------------- Page -------------------- */

export default function DebtPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  /* form */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"credit" | "loan">("credit");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [apr, setApr] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  /* pay */
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  /* -------------------- Load -------------------- */

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        window.location.href = "/signup?mode=login";
        return;
      }

      setUserId(data.user.id);

      const { data: debtsData, error: dbError } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      if (dbError) {
        setMessage(dbError.message);
      } else {
        setDebts((debtsData || []) as DebtRow[]);
      }

      setLoading(false);
    }

    init();
  }, []);

  async function refresh() {
    if (!userId) return;

    const { data } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setDebts((data || []) as DebtRow[]);
  }

  /* -------------------- Save -------------------- */

  async function saveDebt() {
    if (!userId) return;

    const bal = Number(balance);

    if (!name.trim() || !Number.isFinite(bal)) {
      setMessage("Enter valid name + balance");
      return;
    }

    const payload = {
      user_id: userId,
      name: name.trim(),
      kind,
      balance: bal,
      min_payment: minPayment ? Number(minPayment) : null,
      apr: apr ? Number(apr) : null,
      credit_limit: creditLimit ? Number(creditLimit) : null,
      due_date: dueDate || null,
      note: note || null,
    };

    const { error } = editingId
      ? await supabase.from("debts").update(payload).eq("id", editingId)
      : await supabase.from("debts").insert(payload);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(editingId ? "Debt updated" : "Debt added");

    setEditingId(null);
    setName("");
    setBalance("");
    setMinPayment("");
    setApr("");
    setCreditLimit("");
    setDueDate("");
    setNote("");

    refresh();
  }

  /* -------------------- Delete -------------------- */

  async function deleteDebt(id: string) {
    await supabase.from("debts").delete().eq("id", id);
    setDebts((d) => d.filter((x) => x.id !== id));
  }

  /* -------------------- Pay -------------------- */

  async function payDebt(id: string) {
    const amt = Number(payAmount);
    if (!amt || !userId) return;

    await supabase.from("payments").insert({
      user_id: userId,
      debt_id: id,
      amount: amt,
      date_iso: todayISO(),
    });

    setPayingId(null);
    setPayAmount("");
  }

  /* -------------------- Stats -------------------- */

  const totals = useMemo(() => {
    return debts.reduce(
      (acc, d) => {
        acc.balance += d.balance || 0;
        acc.min += d.monthly_min_payment || d.min_payment || 0;
        return acc;
      },
      { balance: 0, min: 0 }
    );
  }, [debts]);

  const chart = useMemo(
    () =>
      debts
        .map((d) => ({ label: d.name, value: d.balance }))
        .sort((a, b) => b.value - a.value),
    [debts]
  );

  /* -------------------- UI -------------------- */

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <h1 className="text-3xl font-black">Debt</h1>

      {message ? (
        <div className="mt-3 text-sm text-zinc-600">{message}</div>
      ) : null}

      {/* Summary */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card label="Total Debt" value={totals.balance} />
        <Card label="Monthly Minimums" value={totals.min} />
        <div className="rounded-xl bg-white p-4">
          <DonutChart values={chart} />
        </div>
      </div>

      {/* List */}
      <div className="mt-8 space-y-3">
        {debts.map((d) => (
          <div key={d.id} className="rounded-xl bg-white p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-sm text-zinc-500">
                  ${d.balance.toFixed(2)} · {d.kind}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setPayingId(d.id)}>Pay</button>
                <button onClick={() => deleteDebt(d.id)}>Delete</button>
              </div>
            </div>

            {payingId === d.id && (
              <div className="mt-3 flex gap-2">
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="border p-2"
                />
                <button onClick={() => payDebt(d.id)}>Submit</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="mt-10 space-y-2">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="Balance"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="border p-2"
        />

        <button
          onClick={saveDebt}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Save Debt
        </button>
      </div>
    </main>
  );
}

/* -------------------- Card -------------------- */

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-bold">${value.toFixed(2)}</div>
    </div>
  );
}
