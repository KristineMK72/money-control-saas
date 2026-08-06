"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clampMoney } from "@/lib/money/math";
import { playLevelUp, playXpGain } from "@/lib/sounds";
import { awardXp } from "@/lib/xp/awardXp";

/* ─── Achievement definitions ───────────────────────────────────── */

type AchievementData = {
  incomeCount:     number;
  incomeTotal:     number;
  incomeMonths:    number;   // distinct months with income
  paymentCount:    number;
  debtPayments:    number;
  billCount:       number;
  debtCount:       number;
  reputation:      number;
  level:           number;
  xp:              number;
  onboarded:       boolean;
};

type Achievement = {
  id:          string;
  icon:        string;
  title:       string;
  description: string;
  hint:        string;       // shown when locked
  xpReward:    number;
  tier:        1 | 2 | 3;
  check:       (d: AchievementData) => boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  /* ── Tier 1: First steps ── */
  {
    id: "colony_founded", icon: "🏛", tier: 1, xpReward: 50,
    title: "Colony Founded",
    description: "Completed the Governor's onboarding tour.",
    hint: "Complete the onboarding tour to claim this honor.",
    check: d => d.onboarded,
  },
  {
    id: "first_scroll", icon: "📜", tier: 1, xpReward: 50,
    title: "First Scroll Signed",
    description: "Logged thy first income entry in the ledger.",
    hint: "Record thy first income to unlock.",
    check: d => d.incomeCount >= 1,
  },
  {
    id: "first_payment", icon: "🪙", tier: 1, xpReward: 50,
    title: "First Payment Recorded",
    description: "Made thy first official payment in the Treasury.",
    hint: "Record a payment to unlock.",
    check: d => d.paymentCount >= 1,
  },
  {
    id: "debt_mapped", icon: "💳", tier: 1, xpReward: 50,
    title: "Debt Mapped",
    description: "Added thy first debt to the ledger — awareness is the first victory.",
    hint: "Add a debt to the Obligations Ledger.",
    check: d => d.debtCount >= 1,
  },
  {
    id: "bill_of_rights", icon: "📋", tier: 1, xpReward: 50,
    title: "Bill of Rights",
    description: "Added thy first bill — now Ben knows what is urgent.",
    hint: "Add a bill to the Obligations Ledger.",
    check: d => d.billCount >= 1,
  },

  /* ── Tier 2: Building momentum ── */
  {
    id: "merchant_of_record", icon: "📈", tier: 2, xpReward: 100,
    title: "Merchant of Record",
    description: "Logged 10 or more income entries. The colony is growing.",
    hint: "Log 10 income entries to unlock.",
    check: d => d.incomeCount >= 10,
  },
  {
    id: "three_month_streak", icon: "🗓️", tier: 2, xpReward: 100,
    title: "Three Moon Merchant",
    description: "Logged income across 3 or more calendar months.",
    hint: "Log income in 3 different months to unlock.",
    check: d => d.incomeMonths >= 3,
  },
  {
    id: "treasury_builder", icon: "💰", tier: 2, xpReward: 150,
    title: "Treasury Builder",
    description: "Logged a total of $1,000 or more in income.",
    hint: "Log $1,000 total in income entries.",
    check: d => d.incomeTotal >= 1000,
  },
  {
    id: "bill_collector", icon: "🗂️", tier: 2, xpReward: 75,
    title: "Bill Collector's Honor",
    description: "Added 5 or more bills to the ledger. A well-mapped colony.",
    hint: "Add 5 or more bills to unlock.",
    check: d => d.billCount >= 5,
  },
  {
    id: "payment_warrior", icon: "⚔️", tier: 2, xpReward: 100,
    title: "Payment Warrior",
    description: "Made 10 or more payments. The Treasury grows stronger.",
    hint: "Record 10 payments to unlock.",
    check: d => d.paymentCount >= 10,
  },

  /* ── Tier 3: Elite status ── */
  {
    id: "debt_slayer", icon: "🗡️", tier: 3, xpReward: 200,
    title: "Debt Slayer",
    description: "Made 5 or more payments toward debts. A true colonial warrior.",
    hint: "Make 5 debt payments to unlock.",
    check: d => d.debtPayments >= 5,
  },
  {
    id: "town_recorder", icon: "🌟", tier: 3, xpReward: 150,
    title: "Town Recorder",
    description: "Reached 100 reputation. The colony takes notice.",
    hint: "Earn 100 reputation to unlock.",
    check: d => d.reputation >= 100,
  },
  {
    id: "treasury_keeper", icon: "🏅", tier: 3, xpReward: 200,
    title: "Treasury Keeper",
    description: "Reached 250 reputation. Thy name is spoken with respect.",
    hint: "Earn 250 reputation to unlock.",
    check: d => d.reputation >= 250,
  },
  {
    id: "governor_ascendant", icon: "👑", tier: 3, xpReward: 250,
    title: "Governor Ascendant",
    description: "Reached Level 5. The colony is in capable hands.",
    hint: "Reach Level 5 to unlock.",
    check: d => d.level >= 5,
  },
  {
    id: "founding_financier", icon: "🔱", tier: 3, xpReward: 500,
    title: "Founding Financier",
    description: "Reached 1,000 reputation. A legend of the colonial Treasury.",
    hint: "Earn 1,000 reputation — the highest honor.",
    check: d => d.reputation >= 1000,
  },
];

const TIER_LABELS: Record<number, string> = {
  1: "First Steps",
  2: "Building Momentum",
  3: "Elite Status",
};

/* ─── Page ──────────────────────────────────────────────────────── */

export default function AchievementsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading,  setLoading]  = useState(true);
  const [ach,      setAch]      = useState<AchievementData | null>(null);
  const [message,  setMessage]  = useState("");

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Sign in to view thy Trophy Room."); setLoading(false); return; }

    const [incomeRes, paymentsRes, billsRes, debtsRes, profileRes] = await Promise.all([
      supabase.from("income_entries").select("amount, date_iso, created_at").eq("user_id", user.id),
      supabase.from("payments").select("id, debt_id").eq("user_id", user.id),
      supabase.from("bills").select("id").eq("user_id", user.id),
      supabase.from("debts").select("id").eq("user_id", user.id),
      supabase.from("profiles")
        .select("xp, level, reputation, onboarding_complete")
        .eq("user_id", user.id).maybeSingle(),
    ]);

    const incomeRows   = incomeRes.data   || [];
    const paymentRows  = paymentsRes.data || [];
    const billRows     = billsRes.data    || [];
    const debtRows     = debtsRes.data    || [];
    const profile      = profileRes.data;

    const incomeTotal  = incomeRows.reduce((s, r) => s + clampMoney(r.amount), 0);
    const incomeMonths = new Set(incomeRows.map(r => (r.date_iso || r.created_at || "").slice(0, 7)
    ).filter(Boolean)).size;
    const debtPayments = paymentRows.filter(p => p.debt_id).length;

    const data: AchievementData = {
      incomeCount:  incomeRows.length,
      incomeTotal,
      incomeMonths,
      paymentCount: paymentRows.length,
      debtPayments,
      billCount:    billRows.length,
      debtCount:    debtRows.length,
      reputation:   profile?.reputation ?? 0,
      level:        profile?.level      ?? 1,
      xp:           profile?.xp         ?? 0,
      onboarded:    profile?.onboarding_complete ?? false,
    };

    setAch(data);
    setLoading(false);

    const unlocked = ACHIEVEMENTS.filter(a => a.check(data));
    let awarded = false;
    let gainedLevel = false;
    for (const achievement of unlocked) {
      const result = await awardXp({
        amount: achievement.xpReward,
        reason: `Unlocked achievement: ${achievement.title}`,
        eventKey: `achievement:${achievement.id}`,
        playSound: false,
      });
      if (!result.ok) {
        setMessage(result.error || "Achievement XP could not be recorded.");
        break;
      }
      if (!result.alreadyClaimed) {
        awarded = true;
        gainedLevel ||= !!result.leveledUp;
      }
    }
    if (awarded) gainedLevel ? playLevelUp() : playXpGain();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ben-trophies bg-cover bg-center">
        <div style={{ background: "rgba(15,8,4,0.92)", border: "1px solid rgba(201,168,76,0.5)",
                      borderRadius: "0.75rem", padding: "2rem 3rem", textAlign: "center" }}>
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>
            Opening the Trophy Room&hellip;
          </p>
        </div>
      </div>
    );
  }

  const unlockedCount = ach ? ACHIEVEMENTS.filter(a => a.check(ach)).length : 0;
  const totalXP       = ach ? ACHIEVEMENTS.filter(a => a.check(ach)).reduce((s, a) => s + a.xpReward, 0) : 0;

  return (
    <div className="min-h-screen bg-ben-trophies bg-cover bg-center bg-fixed"
         style={{ fontFamily: "EB Garamond, serif" }}>
      <div className="min-h-screen pb-28" style={{ background: "rgba(10,5,2,0.72)" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">

          {/* ── Header ── */}
          <div className="text-center pt-4 pb-2">
            <p className="text-xs uppercase tracking-[0.2em] font-cinzel font-semibold"
               style={{ color: "#6b4423" }}>AskBen</p>
            <h1 className="font-cinzel text-4xl font-bold mt-1" style={{ color: "#c9a84c" }}>
              Trophy Room
            </h1>
            <p className="mt-2 text-base italic max-w-xl mx-auto" style={{ color: "#9a7d5a" }}>
              Thy victories shall be recorded here — debts defeated, bills paid, savings grown, and streaks protected.
            </p>
          </div>

          {/* ── Progress summary ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Unlocked",    value: `${unlockedCount} / ${ACHIEVEMENTS.length}` },
              { label: "XP Earned",   value: `${totalXP.toLocaleString()} XP` },
              { label: "Completion",  value: `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-4 text-center"
                   style={{ background: "rgba(15,8,4,0.88)", border: "1px solid rgba(107,68,35,0.5)" }}>
                <p className="text-[10px] uppercase tracking-widest font-cinzel" style={{ color: "#6b4423" }}>{label}</p>
                <p className="mt-1 text-xl font-bold font-cinzel" style={{ color: "#c9a84c" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Progress bar ── */}
          <div className="rounded-xl px-5 py-3"
               style={{ background: "rgba(15,8,4,0.88)", border: "1px solid rgba(107,68,35,0.5)" }}>
            <div className="flex justify-between mb-1.5">
              <p className="text-[10px] font-cinzel uppercase tracking-widest" style={{ color: "#6b4423" }}>
                Overall Progress
              </p>
              <p className="text-[10px] font-cinzel" style={{ color: "#c9a84c" }}>
                {unlockedCount} of {ACHIEVEMENTS.length}
              </p>
            </div>
            <div className="h-2 rounded-full overflow-hidden"
                 style={{ background: "rgba(107,68,35,0.3)" }}>
              <div className="h-full rounded-full transition-all duration-1000"
                   style={{
                     width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
                     background: "linear-gradient(90deg, #8b6914, #c9a84c, #e8c96a)",
                   }} />
            </div>
          </div>

          {/* ── Achievement tiers ── */}
          {([1, 2, 3] as const).map(tier => {
            const tierAchs = ACHIEVEMENTS.filter(a => a.tier === tier);
            const tierUnlocked = ach ? tierAchs.filter(a => a.check(ach)).length : 0;

            return (
              <div key={tier}>
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1" style={{ background: "rgba(107,68,35,0.4)" }} />
                  <p className="font-cinzel text-xs uppercase tracking-widest font-bold px-3"
                     style={{ color: "#9a7d5a" }}>
                    Tier {tier} — {TIER_LABELS[tier]} ({tierUnlocked}/{tierAchs.length})
                  </p>
                  <div className="h-px flex-1" style={{ background: "rgba(107,68,35,0.4)" }} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tierAchs.map(achievement => {
                    const unlocked = ach ? achievement.check(ach) : false;
                    return (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        unlocked={unlocked}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Notice ── */}
          {message && (
            <div className="rounded-xl px-4 py-3 text-sm text-center"
                 style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)",
                          color: "#c9a84c" }}>
              {message}
            </div>
          )}

          {/* ── Quote ── */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3"
               style={{ background: "rgba(245,230,200,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              &ldquo;Energy and persistence conquer all things.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Achievement card ───────────────────────────────────────────── */

function AchievementCard({ achievement, unlocked }: {
  achievement: Achievement; unlocked: boolean;
}) {
  const tierGlow: Record<number, string> = {
    1: "rgba(201,168,76,0.15)",
    2: "rgba(201,168,76,0.22)",
    3: "rgba(201,168,76,0.3)",
  };

  return (
    <div className="rounded-xl p-5 flex flex-col gap-2 transition-all duration-300"
         style={{
           background: unlocked
             ? tierGlow[achievement.tier]
             : "rgba(15,8,4,0.7)",
           border: `1px solid ${unlocked
             ? `rgba(201,168,76,${0.3 + achievement.tier * 0.1})`
             : "rgba(107,68,35,0.3)"}`,
           boxShadow: unlocked
             ? `0 0 20px rgba(201,168,76,${0.08 * achievement.tier})`
             : "none",
           opacity: unlocked ? 1 : 0.65,
         }}>

      {/* Icon + lock */}
      <div className="flex items-start justify-between">
        <span className="text-3xl" style={{ filter: unlocked ? "none" : "grayscale(1) brightness(0.4)" }}>
          {achievement.icon}
        </span>
        {unlocked ? (
          <span className="text-[10px] font-cinzel font-bold rounded-full px-2 py-0.5"
                style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c",
                         border: "1px solid rgba(201,168,76,0.4)" }}>
            ✦ UNLOCKED
          </span>
        ) : (
          <span className="text-[10px] font-cinzel rounded-full px-2 py-0.5"
                style={{ background: "rgba(107,68,35,0.2)", color: "#6b4423",
                         border: "1px solid rgba(107,68,35,0.3)" }}>
            🔒 LOCKED
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-cinzel text-base font-bold leading-tight"
          style={{ color: unlocked ? "#e8d5b7" : "#6b4423" }}>
        {achievement.title}
      </h3>

      {/* Description or hint */}
      <p className="text-sm leading-relaxed"
         style={{ color: unlocked ? "#9a7d5a" : "#4a3020", fontStyle: unlocked ? "normal" : "italic" }}>
        {unlocked ? achievement.description : achievement.hint}
      </p>

      {/* XP reward */}
      <div className="mt-auto pt-2" style={{ borderTop: "1px solid rgba(107,68,35,0.2)" }}>
        <p className="text-[11px] font-cinzel font-bold"
           style={{ color: unlocked ? "#c9a84c" : "#4a3020" }}>
          {unlocked ? `✦ +${achievement.xpReward} XP earned` : `+${achievement.xpReward} XP on unlock`}
        </p>
      </div>
    </div>
  );
}
