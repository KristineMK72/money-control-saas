"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBenPersona, getTownCrierMessage } from "@/lib/ben/personas";
import { daysUntil, nextDateFromDueDay } from "@/lib/money/dates";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DueRow = {
  id: string;
  name?: string | null;
  due_date?: string | null;
  due_day?: number | string | null;
  due?: string | null;
  target?: number | string | null;
  monthly_target?: number | string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  monthly_min_payment?: number | string | null;
};

type BriefingItem = {
  id: string;
  name: string;
  kind: "Bill" | "Debt";
  dueDate: string;
  daysAway: number;
  amount: number | null;
};

const SESSION_KEY_PREFIX = "askben:town-crier:";

function resolveDueDate(row: DueRow) {
  const direct = row.due_date ?? row.due ?? null;
  const directDays = daysUntil(direct);
  if (direct && directDays !== null && directDays >= 0) return direct.slice(0, 10);
  return nextDateFromDueDay(row.due_day);
}

function firstAmount(...values: Array<number | string | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const amount = Number(value);
    if (Number.isFinite(amount) && amount >= 0) return amount;
  }
  return null;
}

function toBriefingItem(row: DueRow, kind: BriefingItem["kind"]): BriefingItem | null {
  const dueDate = resolveDueDate(row);
  const daysAway = daysUntil(dueDate);
  if (!dueDate || daysAway === null || daysAway < 0 || daysAway > 14) return null;

  return {
    id: `${kind}:${row.id}`,
    name: row.name?.trim() || (kind === "Bill" ? "Unnamed bill" : "Unnamed debt"),
    kind,
    dueDate,
    daysAway,
    amount: kind === "Bill"
      ? firstAmount(row.monthly_target, row.target, row.min_payment)
      : firstAmount(row.monthly_min_payment, row.min_payment),
  };
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function formatAmount(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export default function TownCrierBriefing() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BriefingItem[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBriefing() {
      if (pathname.startsWith("/onboarding/")) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;

      const key = `${SESSION_KEY_PREFIX}${user.id}`;
      if (window.sessionStorage.getItem(key)) return;

      const [profileResult, billsResult, debtsResult] = await Promise.all([
        supabase.from("profiles").select("ben_voice").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("bills")
          .select("id, name, due_date, due, due_day, target, monthly_target, min_payment")
          .eq("user_id", user.id),
        supabase
          .from("debts")
          .select("id, name, due_date, due_day, min_payment, monthly_min_payment")
          .eq("user_id", user.id),
      ]);

      if (!active) return;
      if (billsResult.error || debtsResult.error) return;

      const upcoming = [
        ...(billsResult.data ?? []).map((row) => toBriefingItem(row, "Bill")),
        ...(debtsResult.data ?? []).map((row) => toBriefingItem(row, "Debt")),
      ]
        .filter((item): item is BriefingItem => item !== null)
        .sort((a, b) => a.daysAway - b.daysAway || a.name.localeCompare(b.name));

      window.sessionStorage.setItem(key, "shown");
      setSessionKey(key);
      setPersonaId(profileResult.data?.ben_voice ?? "encouraging");
      setItems(upcoming);
      setOpen(true);
    }

    void loadBriefing();
    return () => {
      active = false;
    };
  }, [pathname, supabase]);

  const persona = getBenPersona(personaId);
  const message = useMemo(
    () => getTownCrierMessage(personaId, items.length, items.filter((item) => item.daysAway <= 3).length),
    [items, personaId],
  );

  function close() {
    if (sessionKey) window.sessionStorage.setItem(sessionKey, "shown");
    setOpen(false);
  }

  function openBills() {
    close();
    router.push("/bills");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="town-crier-title"
    >
      <section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#c9a84c]/60 bg-[#160d08] p-6 text-[#f5e6c8] shadow-2xl sm:p-8">
        <div className="text-center">
          <span className="text-4xl" aria-hidden="true">🔔</span>
          <p className="mt-2 font-cinzel text-xs font-bold uppercase tracking-[0.32em] text-[#c9a84c]">
            Town Crier · Fourteen-Day Briefing
          </p>
          <h2 id="town-crier-title" className="mt-2 font-cinzel text-3xl font-bold">
            Hear ye, Governor
          </h2>
          <p className="mt-3 leading-7 text-[#d6c09a]">{message}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#9a7d5a]">
            Counsel from {persona.label}
          </p>
        </div>

        {items.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {items.map((item) => {
              const amount = formatAmount(item.amount);
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#c9a84c]/25 bg-black/25 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#f5e6c8]">{item.name}</p>
                    <p className="text-xs uppercase tracking-wider text-[#9a7d5a]">{item.kind}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-[#c9a84c]">{formatDueDate(item.dueDate)}</p>
                    <p className="text-xs text-[#d6c09a]">
                      {item.daysAway === 0 ? "Due today" : `In ${item.daysAway} day${item.daysAway === 1 ? "" : "s"}`}
                      {amount !== null ? ` · ${amount}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-center text-sm text-emerald-100">
            No recorded bills or debts are due in the next 14 days.
          </div>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-[#c9a84c]/35 px-5 py-3 font-cinzel font-bold text-[#d6c09a]"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={openBills}
            className="rounded-xl bg-[#c9a84c] px-5 py-3 font-cinzel font-bold text-[#1a0f0a]"
          >
            Open Bills
          </button>
        </div>
      </section>
    </div>
  );
}
