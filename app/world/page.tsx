"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BenWorldMap from "@/components/BenWorldMap";
import BenWorldWeatherOverlay from "@/components/BenWorldWeatherOverlay";
import TreasuryCoinMenu from "@/components/TreasuryCoinMenu";
import StreakBadge from "@/components/StreakBadge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UserMeta = { name: string | null };

const NAV_TILES = [
  { href: "/dashboard",    icon: "🏛",  label: "Governor's Office",  sub: "Overview & forecast"     },
  { href: "/income",       icon: "📜",  label: "Income Ledger",      sub: "Log thy earnings"        },
  { href: "/bills",        icon: "📋",  label: "Obligations",        sub: "Bills & debts"           },
  { href: "/payments",     icon: "🪙",  label: "Payment Hall",       sub: "Record victories"        },
  { href: "/achievements", icon: "🏆",  label: "Trophy Room",        sub: "Thy colonial honors"     },
  { href: "/forecast",     icon: "🔭",  label: "Treasury Forecast",  sub: "What lies ahead"         },
  { href: "/calendar",     icon: "🗓️",  label: "Colonial Calendar",  sub: "Due dates & events"      },
  { href: "/settings",     icon: "⚙️",  label: "Settings",           sub: "Govern thy account"      },
];

const FEATURES = [
  { icon: "🪙", title: "Track Every Coin",     body: "Log income, bills, debts and payments in one colonial ledger." },
  { icon: "🏆", title: "Earn XP & Ranks",      body: "Every action builds thy reputation. Rise from Apprentice to Founding Financier." },
  { icon: "🔥", title: "Protect Thy Streak",   body: "Consecutive days of activity compound thy progress — and thy pride." },
  { icon: "🪶", title: "Ben Advises Daily",     body: "Ben Franklin gives calm priorities when money feels overwhelming." },
];

export default function WorldPage() {
  const supabase = createSupabaseBrowserClient();
  const [user,    setUser]    = useState<UserMeta | null | "loading">("loading");
  const [storm,   setStorm]   = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void supabase.from("profiles").select("full_name").eq("id", data.user.id).single()
          .then(({ data: p }) => setUser({ name: p?.full_name ?? null }));
      } else {
        setUser(null);
      }
    });
  }, []);

  const isLoading = user === "loading";
  const loggedIn  = user !== null && user !== "loading";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080706]"
          style={{ fontFamily: "EB Garamond, serif" }}>

      {/* ── Existing weather overlay ── */}
      <BenWorldWeatherOverlay fog storm={storm} />

      {/* ── Existing map ── */}
      <div className="relative z-10 mx-auto max-w-6xl p-3 md:p-6">
        <BenWorldMap />
      </div>

      {/* ── Existing coin menu ── */}
      <TreasuryCoinMenu />

      {/* ── Auth-aware overlay ─────────────────────────────────── */}

      {!isLoading && !loggedIn && <LandingHero onStormToggle={() => setStorm(s => !s)} />}
      {!isLoading &&  loggedIn && <ColonyHub user={user as UserMeta} />}

      {/* Loading shimmer */}
      {isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>
            Ben is consulting the ledger&hellip;
          </p>
        </div>
      )}
    </main>
  );
}

/* ─── Landing hero (logged out) ─────────────────────────────────── */

function LandingHero({ onStormToggle }: { onStormToggle: () => void }) {
  return (
    <>
      <style>{`
        @keyframes proclamation-rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes gold-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .hero-card { animation: proclamation-rise 0.7s ease-out forwards; }
        .gold-title {
          background: linear-gradient(90deg, #8b6914, #c9a84c, #e8c96a, #c9a84c, #8b6914);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gold-shimmer 4s linear infinite;
        }
      `}</style>

      {/* Dark scrim so hero is readable over the map */}
      <div className="fixed inset-0 z-20 pointer-events-none"
           style={{ background: "linear-gradient(to bottom, rgba(5,2,0,0.55) 0%, rgba(5,2,0,0.3) 50%, rgba(5,2,0,0.75) 100%)" }} />

      {/* Hero panel — centered */}
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center px-4 pb-8">
        <div className="hero-card w-full max-w-xl text-center"
             style={{
               background:     "rgba(10,5,2,0.93)",
               border:         "1px solid rgba(201,168,76,0.55)",
               borderRadius:   "1rem",
               padding:        "2.5rem 2rem",
               boxShadow:      "0 0 80px rgba(201,168,76,0.12), 0 30px 60px rgba(0,0,0,0.9)",
             }}>

          {/* Top rule */}
          <div className="h-px mb-5"
               style={{ background: "linear-gradient(90deg,transparent,#c9a84c,transparent)" }} />

          {/* Badge */}
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] font-cinzel font-bold mb-4"
                style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.4)",
                         color: "#9a7d5a" }}>
            Colonial Financial System · Est. 2025
          </span>

          {/* Headline */}
          <h1 className="gold-title font-cinzel text-5xl font-bold leading-tight">
            AskBen
          </h1>
          <p className="mt-2 font-cinzel text-lg font-semibold" style={{ color: "#e8d5b7" }}>
            Thy Financial Colony Awaits
          </p>
          <p className="mt-3 text-base leading-relaxed max-w-sm mx-auto"
             style={{ color: "#9a7d5a" }}>
            Track debts, bills, income, and payments. Earn XP. Protect thy streak.
            Ben Franklin advises — without judgment.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link href="/signup"
                  className="rounded-xl px-7 py-3 font-cinzel text-sm font-bold uppercase tracking-wider transition hover:opacity-90"
                  style={{ background: "#c9a84c", color: "#1a0f0a" }}>
              ✦ Found Thy Colony
            </Link>
            <Link href="/login"
                  className="rounded-xl px-7 py-3 font-cinzel text-sm font-bold uppercase tracking-wider transition"
                  style={{ background: "rgba(107,68,35,0.2)", border: "1px solid rgba(107,68,35,0.5)",
                           color: "#9a7d5a" }}>
              Sign In
            </Link>
          </div>

          {/* Features row */}
          <div className="mt-7 grid grid-cols-2 gap-2 text-left">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl p-3"
                   style={{ background: "rgba(107,68,35,0.1)", border: "1px solid rgba(107,68,35,0.25)" }}>
                <p className="font-cinzel text-xs font-bold" style={{ color: "#c9a84c" }}>
                  {f.icon} {f.title}
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed italic"
                   style={{ color: "#6b4423" }}>{f.body}</p>
              </div>
            ))}
          </div>

          {/* Ben quote */}
          <div className="mt-5 flex items-start gap-2 text-left rounded-xl px-4 py-3"
               style={{ background: "rgba(245,230,200,0.04)", border: "1px solid rgba(107,68,35,0.25)" }}>
            <span className="text-lg shrink-0 mt-0.5">🪶</span>
            <p className="text-xs italic leading-relaxed" style={{ color: "#9a7d5a" }}>
              &ldquo;An investment in knowledge pays the best interest.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

          {/* Bottom rule */}
          <div className="h-px mt-5"
               style={{ background: "linear-gradient(90deg,transparent,#c9a84c,transparent)" }} />
        </div>

        {/* Storm toggle — small ambient control */}
        <button onClick={onStormToggle}
                className="mt-4 text-[11px] font-cinzel transition"
                style={{ color: "#4a3020" }}>
          Toggle storm &nbsp;⛈
        </button>
      </div>
    </>
  );
}

/* ─── Colony hub (logged in) ─────────────────────────────────────── */

function ColonyHub({ user }: { user: UserMeta }) {
  const name = user.name?.split(" ")[0];

  return (
    <>
      <style>{`
        @keyframes hub-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .hub-in { animation: hub-fade 0.5s ease-out forwards; }
      `}</style>

      {/* Thin top scrim */}
      <div className="fixed inset-0 z-20 pointer-events-none"
           style={{ background: "linear-gradient(to bottom, rgba(5,2,0,0.5) 0%, rgba(5,2,0,0.0) 40%, rgba(5,2,0,0.6) 100%)" }} />

      {/* Hub overlay */}
      <div className="hub-in fixed inset-x-0 bottom-0 z-30 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">

          {/* Welcome + streak row */}
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-cinzel"
                 style={{ color: "#6b4423" }}>Welcome back</p>
              <h2 className="font-cinzel text-2xl font-bold" style={{ color: "#c9a84c" }}>
                {name ? `Governor ${name}` : "Governor"}
              </h2>
            </div>
            {/* Streak inline */}
            <div className="ml-auto w-56 shrink-0">
              <StreakBadge />
            </div>
          </div>

          {/* Nav tile grid */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
            {NAV_TILES.map(tile => (
              <NavTile key={tile.href} {...tile} />
            ))}
          </div>

          {/* Bottom quote strip */}
          <div className="mt-3 rounded-xl px-4 py-2 flex items-center gap-2"
               style={{ background: "rgba(10,5,2,0.85)", border: "1px solid rgba(107,68,35,0.3)" }}>
            <span className="text-base shrink-0">🪶</span>
            <p className="text-xs italic" style={{ color: "#6b4423" }}>
              &ldquo;Beware of little expenses; a small leak will sink a great ship.&rdquo; &mdash; Franklin
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function NavTile({ href, icon, label, sub }: {
  href: string; icon: string; label: string; sub: string;
}) {
  return (
    <Link href={href}
          className="flex flex-col items-center text-center rounded-xl p-2.5 gap-1 transition group"
          style={{
            background: "rgba(10,5,2,0.88)",
            border:     "1px solid rgba(107,68,35,0.4)",
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.5)";
            (e.currentTarget as HTMLAnchorElement).style.background  = "rgba(20,12,5,0.95)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(107,68,35,0.4)";
            (e.currentTarget as HTMLAnchorElement).style.background  = "rgba(10,5,2,0.88)";
          }}>
      <span className="text-2xl">{icon}</span>
      <p className="font-cinzel text-[10px] font-bold leading-tight"
         style={{ color: "#c9a84c" }}>{label}</p>
      <p className="text-[9px] italic leading-tight hidden sm:block"
         style={{ color: "#6b4423" }}>{sub}</p>
    </Link>
  );
}
