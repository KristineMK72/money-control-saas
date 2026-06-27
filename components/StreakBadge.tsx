"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { calculateStreak } from "@/lib/streak";

type StreakData = {
  current:     number;
  best:        number;
  todayActive: boolean;
  streakAlive: boolean;
  lastActive:  string | null;
};

function flameColor(streak: number): string {
  if (streak >= 30) return "#ff6b35";
  if (streak >= 14) return "#f59e0b";
  if (streak >= 7)  return "#c9a84c";
  return "#9a7d5a";
}

function flameEmoji(streak: number): string {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 7)  return "🔥";
  if (streak >= 1)  return "✦";
  return "⭕";
}

function streakTitle(streak: number): string {
  if (streak >= 30) return "Colonial Legend";
  if (streak >= 14) return "Treasury Guardian";
  if (streak >= 7)  return "Governor's Streak";
  if (streak >= 3)  return "Rising Merchant";
  if (streak >= 1)  return "Colony Active";
  return "Streak Unbegun";
}

export default function StreakBadge() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [data,    setData]    = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [paymentsRes, incomeRes] = await Promise.all([
      supabase.from("payments").select("date_iso, created_at").eq("user_id", user.id),
      supabase.from("income_entries").select("date_iso, created_at").eq("user_id", user.id),
    ]);

    const allDates = [
      ...(paymentsRes.data  || []).map(r => r.date_iso || r.created_at),
      ...(incomeRes.data    || []).map(r => r.date_iso || r.created_at),
    ];

    setData(calculateStreak(allDates));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="rounded-xl px-5 py-4 animate-pulse"
           style={{ background: "rgba(15,8,4,0.88)", border: "1px solid rgba(107,68,35,0.4)",
                    fontFamily: "EB Garamond, serif" }}>
        <p className="text-xs font-cinzel" style={{ color: "#6b4423" }}>Loading streak…</p>
      </div>
    );
  }

  if (!data) return null;

  const color   = flameColor(data.current);
  const flame   = flameEmoji(data.current);
  const title   = streakTitle(data.current);
  const alive   = data.streakAlive;
  const warning = !data.todayActive && data.current > 0;

  return (
    <>
      <style>{`
        @keyframes flame-pulse {
          0%, 100% { transform: scale(1) rotate(-2deg); }
          50%       { transform: scale(1.12) rotate(2deg); }
        }
        @keyframes streak-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .flame-anim { animation: flame-pulse 1.8s ease-in-out infinite; display: inline-block; }
        .streak-num {
          background: linear-gradient(90deg, ${color}, #fff8e7, ${color});
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: streak-shimmer 3s linear infinite;
        }
      `}</style>

      <div className="rounded-xl overflow-hidden"
           style={{
             background:   "rgba(15,8,4,0.92)",
             border:       `1px solid ${alive ? color + "60" : "rgba(107,68,35,0.35)"}`,
             boxShadow:    alive && data.current >= 7 ? `0 0 20px ${color}22` : "none",
             fontFamily:   "EB Garamond, serif",
           }}>

        {alive && data.current > 0 && (
          <div className="px-4 py-1.5 flex items-center gap-2"
               style={{ background: `${color}18`, borderBottom: `1px solid ${color}30` }}>
            <span className="flame-anim text-base">{flame}</span>
            <p className="text-[10px] uppercase tracking-[0.2em] font-cinzel font-bold"
               style={{ color }}>{title}</p>
          </div>
        )}

        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-cinzel"
                 style={{ color: "#9a7d5a" }}>Current Streak</p>
              <div className="flex items-end gap-2 mt-0.5">
                <span className="streak-num font-cinzel text-5xl font-bold leading-none"
                      style={data.current === 0
                        ? { backgroundImage: "none", WebkitTextFillColor: "#6b4423" }
                        : {}}>
                  {data.current}
                </span>
                <span className="font-cinzel text-sm pb-1.5" style={{ color: "#9a7d5a" }}>
                  {data.current === 1 ? "day" : "days"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest font-cinzel"
                 style={{ color: "#9a7d5a" }}>Best</p>
              <p className="font-cinzel text-2xl font-bold mt-0.5" style={{ color: "#6b4423" }}>
                {data.best}
              </p>
              <p className="text-[10px] font-cinzel" style={{ color: "#4a3020" }}>days</p>
            </div>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(107,68,35,0.25)" }}>
            {data.current === 0 ? (
              <p className="text-xs italic" style={{ color: "#9a7d5a" }}>
                Log income or a payment today to start thy streak.
              </p>
            ) : warning ? (
              <div className="rounded-lg px-3 py-2"
                   style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <p className="text-xs font-cinzel font-bold" style={{ color: "#fbbf24" }}>
                  ⚠ Protect thy streak — log activity before midnight!
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "#4ade80" }}>✓</span>
                <p className="text-xs font-cinzel" style={{ color: "#4ade80" }}>
                  Streak protected today
                </p>
              </div>
            )}

            {data.lastActive && (
              <p className="text-[10px] mt-1.5 italic" style={{ color: "#4a3020" }}>
                Last active: {data.lastActive}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
