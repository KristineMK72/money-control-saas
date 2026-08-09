"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPersona } from "@/lib/ben/personas";

type Item = {
  id: string;
  name: string;
  amount: number | string | null;
  due_date: string | null;
  kind: "bill" | "debt";
};

function daysUntil(dateStr: string) {
  const due = new Date(dateStr + "T12:00:00");
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function buildMessage(
  personaId: string | null,
  items: Item[],
  displayName: string | null
) {
  const persona = getPersona(personaId);
  const name = displayName?.split(" ")[0] || "friend";

  if (items.length === 0) {
    const empty: Record<string, string> = {
      encouraging: `Good morrow, ${name}. No bills or debts press upon the next fortnight. A rare quiet in the Treasury — enjoy it.`,
      funny: `Well met, ${name}! The ledger is suspiciously calm. No bills or debts for two weeks. Even Gossip Ben has nothing to report.`,
      direct: `No bills or debts due in the next 14 days. Use the calm.`,
      governor: `Citizen ${name}, the colony records no immediate demands of bill or debt. Strengthen the walls while the weather is fair.`,
    };
    return empty[persona.id] || empty.encouraging;
  }

  const list = items
    .slice(0, 5)
    .map((item) => {
      const days = item.due_date ? daysUntil(item.due_date) : null;
      const when =
        days === null
          ? "soon"
          : days <= 0
            ? "today / overdue"
            : days === 1
              ? "tomorrow"
              : `in ${days} days`;
      const amt = item.amount ? ` (${money(Number(item.amount))})` : "";
      const tag = item.kind === "debt" ? " [debt]" : "";
      return `${item.name}${tag}${amt} — ${when}`;
    })
    .join("; ");

  const more = items.length > 5 ? ` (and ${items.length - 5} more)` : "";

  const lines: Record<string, string> = {
    encouraging: `Well met, ${name}. These call for attention soon: ${list}${more}. We shall meet them one at a time — steady wins the race.`,
    funny: `Ah, ${name}, the receipts and debts have been talking. Coming up: ${list}${more}. Shall we keep the drama short?`,
    direct: `Due soon: ${list}${more}. Nearest dates first.`,
    governor: `Citizen ${name}, the colony records these approaching duties: ${list}${more}. Diligence preserves reputation.`,
  };

  return lines[persona.id] || lines.encouraging;
}

const SESSION_KEY = "askben_town_crier_shown";

export default function TownCrierBriefing() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("ben_voice, full_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const today = new Date();
      const in14 = new Date();
      in14.setDate(today.getDate() + 14);
      const in14Str = in14.toISOString().slice(0, 10);

      // Bills + Debts (same sources the bills page uses)
      const [billsRes, debtsRes] = await Promise.all([
        supabase
          .from("bills")
          .select("id, name, amount, due_date")
          .eq("user_id", user.id)
          .not("due_date", "is", null)
          .lte("due_date", in14Str)
          .order("due_date", { ascending: true }),
        supabase
          .from("debts")
          .select("id, name, balance, due_date, minimum_payment")
          .eq("user_id", user.id)
          .not("due_date", "is", null)
          .lte("due_date", in14Str)
          .order("due_date", { ascending: true }),
      ]);

      const bills: Item[] = (billsRes.data || []).map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        due_date: b.due_date,
        kind: "bill" as const,
      }));

      const debts: Item[] = (debtsRes.data || []).map((d) => ({
        id: d.id,
        name: d.name,
        amount: d.minimum_payment ?? d.balance,
        due_date: d.due_date,
        kind: "debt" as const,
      }));

      // Merge and sort by due date
      const combined = [...bills, ...debts].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });

      const text = buildMessage(
        profile?.ben_voice ?? null,
        combined,
        profile?.full_name || profile?.display_name || null
      );

      setMessage(text);
      setItemCount(combined.length);
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }

    void load();
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(92vw, 420px)",
          background: "rgba(15,23,42,0.97)",
          border: "1px solid rgba(201,168,76,0.45)",
          borderRadius: 24,
          padding: "28px 24px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          color: "#f5e6c8",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#c9a84c",
            marginBottom: 8,
          }}
        >
          Town Crier
        </p>

        <h2
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontSize: 26,
            fontWeight: 700,
            margin: "0 0 14px",
            color: "#fff7ed",
          }}
        >
          {itemCount > 0 ? "Duties on the horizon" : "A quiet ledger"}
        </h2>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.55,
            color: "#e7d5b5",
            marginBottom: 22,
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 14,
              border: "1px solid rgba(201,168,76,0.4)",
              background: "transparent",
              color: "#c9a84c",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>

          <a
            href="/bills"
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 14,
              border: "none",
              background: "#c9a84c",
              color: "#1a0f0a",
              fontWeight: 800,
              fontSize: 15,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Open Bills
          </a>
        </div>
      </div>
    </div>
  );
}
