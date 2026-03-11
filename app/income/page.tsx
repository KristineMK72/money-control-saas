"use client";


import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/money/utils";

type IncomeSourceRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

type IncomeEntryRow = {
  id: string;
  user_id: string;
  source_name: string;
  amount: number;
  date_iso: string;
  note: string | null;
  created_at: string;
};

export default function IncomePage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [sources, setSources] = useState<IncomeSourceRow[]>([]);
  const [entries, setEntries] = useState<IncomeEntryRow[]>([]);

  const [dateISO, setDateISO] = useState(todayISO());
  const [sourceName, setSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setMessage(sessionError.message);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const [sourcesRes, entriesRes] = await Promise.all([
        supabase.from("income_sources").select("*").order("name", { ascending: true }),
        supabase.from("income_entries").select("*").order("date_iso", { ascending: false }),
      ]);

      if (sourcesRes.error) {
        setMessage(sourcesRes.error.message);
      } else {
        setSources((sourcesRes.data || []) as IncomeSourceRow[]);
      }

      if (entriesRes.error) {
        setMessage(entriesRes.error.message);
      } else {
        setEntries((entriesRes.data || []) as IncomeEntryRow[]);
      }

      setLoading(false);
    }

    init();
  }, []);

  async function refreshIncomeData() {
    const [sourcesRes, entriesRes] = await Promise.all([
      supabase.from("income_sources").select("*").order("name", { ascending: true }),
      supabase.from("income_entries").select("*").order("date_iso", { ascending: false }),
    ]);

    if (!sourcesRes.error) {
      setSources((sourcesRes.data || []) as IncomeSourceRow[]);
    }

    if (!entriesRes.error) {
      setEntries((entriesRes.data || []) as IncomeEntryRow[]);
    }
  }

  async function ensureSourceExists(userId: string, name: string) {
    const clean = name.trim();
    if (!clean) return;

    const exists = sources.some((s) => s.name.toLowerCase() === clean.toLowerCase());
    if (exists) return;

    const { error } = await supabase.from("income_sources").insert({
      user_id: userId,
      name: clean,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleAddIncome() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const cleanSource = sourceName.trim();
    const amt = Number(amount);

    if (!cleanSource || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Please enter a source name and valid amount.");
      return;
    }

    setSaving(true);

    try {
      await ensureSourceExists(userId, cleanSource);

      const { error } = await supabase.from("income_entries").insert({
        user_id: userId,
        source_name: cleanSource,
        amount: amt,
        date_iso: dateISO,
        note: note.trim() || null,
      });

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setSourceName("");
      setAmount("");
      setNote("");
      setDateISO(todayISO());
      setMessage("Income added.");

      await refreshIncomeData();
    } catch (err: any) {
      setMessage(err?.message || "Failed to add income.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteIncome(id: string) {
    setMessage("");

    const { error } = await supabase.from("income_entries").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  const totalIncome = useMemo(() => {
    return entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }, [entries]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Income</h1>
            <p className="mt-2 text-zinc-600">
              Add as many income sources as you want and save them to the cloud.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Dashboard
            </a>

            <a
              href="/forecast"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Forecast
            </a>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            {message}
          </div>
        ) : null}

        {!userId && !loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">You are not logged in.</div>
            <p className="mt-2 text-sm text-zinc-600">
              Go to signup/login first, then come back here.
            </p>
            <div className="mt-4">
              <a
                href="/signup"
                className="inline-flex rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Go to Signup / Login
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total income</div>
            <div className="mt-2 text-3xl font-black">${totalIncome.toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Income sources</div>
            <div className="mt-2 text-3xl font-black">{sources.length}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Entries logged</div>
            <div className="mt-2 text-3xl font-black">{entries.length}</div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Add income</h2>

          <div className="mt-4 grid gap-3">
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />

            <input
              list="income-sources"
              placeholder="Income source (Salon, DoorDash, Tax Refund, Tips)"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />
            <datalist id="income-sources">
              {sources.map((source) => (
                <option key={source.id} value={source.name} />
              ))}
            </datalist>

            <input
              placeholder="Amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />

            <input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />

            <button
              onClick={handleAddIncome}
              disabled={saving || !userId}
              className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Income"}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Saved income sources</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {loading ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                Loading sources...
              </div>
            ) : sources.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No income sources yet.
              </div>
            ) : (
              sources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium"
                >
                  {source.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Income entries</h2>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                Loading income...
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No income logged yet.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">{entry.source_name}</div>
                    <div className="text-sm text-zinc-500">
                      {entry.date_iso}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-semibold">
                      ${Number(entry.amount).toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleDeleteIncome(entry.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
