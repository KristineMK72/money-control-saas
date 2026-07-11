"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getRank(rep: number) {
  if (rep >= 5000) return "Founder of the Republic";
  if (rep >= 2000) return "Governor";
  if (rep >= 1000) return "Colonial Treasurer";
  if (rep >= 500) return "Revenue Collector";
  if (rep >= 250) return "Treasury Keeper";
  if (rep >= 100) return "Ledger Keeper";
  return "Apprentice Clerk";
}

function getNextRank(rep: number) {
  if (rep < 100) return { name: "Ledger Keeper", needed: 100 };
  if (rep < 250) return { name: "Treasury Keeper", needed: 250 };
  if (rep < 500) return { name: "Revenue Collector", needed: 500 };
  if (rep < 1000) return { name: "Colonial Treasurer", needed: 1000 };
  if (rep < 2000) return { name: "Governor", needed: 2000 };
  if (rep < 5000) return { name: "Founder of the Republic", needed: 5000 };
  return null;
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
  const progress = nextRank
    ? Math.min((reputation / nextRank.needed) * 100, 100)
    : 100;

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
              {nextRank ? ` • ${nextRank.needed - reputation} to ${nextRank.name}` : ""}
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
