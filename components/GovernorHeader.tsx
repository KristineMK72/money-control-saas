"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toRoman } from "@/lib/progression";

const NAMED_RANKS: Array<{ needed: number; name: string }> = [
  { needed: 0, name: "Apprentice Clerk" },
  { needed: 100, name: "Ledger Keeper" },
  { needed: 250, name: "Treasury Keeper" },
  { needed: 500, name: "Revenue Collector" },
  { needed: 1000, name: "Colonial Treasurer" },
  { needed: 2000, name: "Governor" },
  { needed: 5000, name: "Founder of the Republic" },
];

const ENDLESS_STEP = 2500;
const ENDLESS_START = 5000;

function getRank(rep: number) {
  let current = NAMED_RANKS[0]!.name;
  for (const rank of NAMED_RANKS) {
    if (rep >= rank.needed) current = rank.name;
  }
  if (rep < ENDLESS_START + ENDLESS_STEP) return current;

  const generation = Math.floor((rep - ENDLESS_START) / ENDLESS_STEP);
  return `Founder of the Republic ${toRoman(generation + 1)}`;
}

function getNextRank(rep: number): { name: string; needed: number } {
  const named = NAMED_RANKS.find((rank) => rep < rank.needed);
  if (named) return named;

  const generation = Math.max(1, Math.floor((rep - ENDLESS_START) / ENDLESS_STEP) + 1);
  return {
    name: `Founder of the Republic ${toRoman(generation + 1)}`,
    needed: ENDLESS_START + generation * ENDLESS_STEP,
  };
}

export default function GovernorHeader() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reputation, setReputation] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadReputation() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("reputation")
        .eq("user_id", user.id)
        .maybeSingle();

      setReputation(Number(data?.reputation ?? 0));
      setLoaded(true);
    }

    void loadReputation();
  }, [supabase]);

  if (!loaded) return null;

  const rank = getRank(reputation);
  const nextRank = getNextRank(reputation);
  const previousNeeded =
    NAMED_RANKS.filter((rank) => rank.needed <= reputation).at(-1)?.needed ?? 0;
  const span = Math.max(1, nextRank.needed - previousNeeded);
  const earned = Math.max(0, reputation - previousNeeded);
  const progress = Math.min(100, (earned / span) * 100);

  return (
    <section
      style={{
        maxWidth: 1180,
        margin: "12px auto 0",
        padding: "12px 14px",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        style={{
          borderRadius: 28,
          border: "1px solid rgba(251,191,36,0.45)",
          background:
            "linear-gradient(135deg, rgba(255,251,235,0.95), rgba(254,243,199,0.9))",
          color: "#18181b",
          padding: 16,
          boxShadow: "0 18px 45px rgba(0,0,0,0.32)",
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#92400e",
              }}
            >
              Governor&apos;s Office
            </div>

            <div
              style={{
                marginTop: 4,
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 25,
                fontWeight: 900,
                color: "#18181b",
              }}
            >
              🏛 {rank}
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, color: "#52525b" }}>
              {reputation.toLocaleString()} Reputation
              {` • ${Math.max(0, nextRank.needed - reputation)} to ${nextRank.name}`}
            </div>
          </div>

          <a
            href="/governor"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 18,
              border: "1px solid rgba(120,53,15,0.25)",
              background: "rgba(255,255,255,0.7)",
              padding: "8px 12px",
              color: "#18181b",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            <img
              src="/ben-head.png"
              alt="Ben"
              style={{
                width: 42,
                height: 42,
                objectFit: "contain",
                borderRadius: 14,
              }}
            />
            Open Office
          </a>
        </div>

        <div>
          <div
            style={{
              height: 10,
              overflow: "hidden",
              borderRadius: 999,
              background: "rgba(63,63,70,0.18)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                borderRadius: 999,
                background: "linear-gradient(90deg, #059669, #f59e0b)",
                transition: "width 300ms ease",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
