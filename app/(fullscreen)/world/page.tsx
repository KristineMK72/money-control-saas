"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BenWorldMap from "@/components/BenWorldMap";
import BenWorldWeatherOverlay from "@/components/BenWorldWeatherOverlay";
import TreasuryCoinMenu from "@/components/TreasuryCoinMenu";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UserMeta = { name: string | null; streak: number };

function calcStreak(dates: (string | null | undefined)[]): number {
  const unique = [...new Set(
    dates.filter(Boolean).map(d => (d as string).slice(0, 10))
  )].sort().reverse();
  if (!unique.length) return 0;
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < unique.length; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    const expected = check.toISOString().slice(0, 10);
    if (unique[i] === expected) streak++;
    else break;
  }
  return streak;
}

export default function WorldPage() {
  const supabase = createSupabaseBrowserClient();
  const [user,       setUser]       = useState<UserMeta | null | "loading">("loading");
  const [showHub,    setShowHub]    = useState(false);
  const [storm,      setStorm]      = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) { if (mounted) setUser(null); return; }

        const [profileRes, paymentsRes, incomeRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", u.id).single(),
          supabase.from("payments").select("date_iso, created_at").eq("user_id", u.id),
          supabase.from("income_entries").select("date_iso, created_at").eq("user_id", u.id),
        ]);

        const allDates = [
          ...(paymentsRes.data || []).map(r => r.date_iso || r.created_at),
          ...(incomeRes.data   || []).map(r => r.date_iso || r.created_at),
        ];

        if (mounted) setUser({
          name:   profileRes.data?.full_name ?? null,
          streak: calcStreak(allDates),
        });
      } catch {
        if (mounted) setUser(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch { /* unsupported on iOS */ }
  };

  const isLoading = user === "loading";
  const loggedIn  = user !== null && user !== "loading";
  const meta      = loggedIn ? (user as UserMeta) : null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#080706]">

      {/* Map — truly fullscreen */}
      <div className="absolute inset-0 z-0">
        <BenWorldMap />
      </div>

      <BenWorldWeatherOverlay fog storm={storm} />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-amber-300/30">
          <img src="/ben-head.png" alt="Ben" className="w-8 h-8" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-amber-100 font-medium text-lg">AskBen</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Inline streak pill */}
          {meta && (
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-300/30">
              <span className="text-sm">{meta.streak >= 7 ? "🔥" : "✦"}</span>
              <span className="text-amber-200 text-sm font-medium">
                {meta.streak}d
              </span>
              {meta.name && (
                <span className="text-amber-400/70 text-sm hidden sm:inline">
                  · {meta.name.split(" ")[0]}
                </span>
              )}
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="bg-black/60 hover:bg-black/90 backdrop-blur-md text-amber-100 px-4 py-2.5 rounded-2xl text-sm border border-amber-300/30 transition"
          >
            {fullscreen ? "Exit" : "⛶"}
          </button>
        </div>
      </div>

      {/* Coin menu */}
      {!showHub && <TreasuryCoinMenu />}

      {/* Ask Ben button */}
      <Link
        href="/chat"
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-br from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-4 rounded-3xl flex items-center gap-3 shadow-2xl border border-amber-300/50 text-lg font-medium active:scale-95 transition-all"
      >
        Ask Ben <span className="text-2xl">💰</span>
      </Link>

      {/* Colony Hub toggle (logged in only) */}
      {loggedIn && (
        <button
          onClick={() => setShowHub(!showHub)}
          className="fixed bottom-8 left-8 z-50 bg-black/70 hover:bg-black/90 backdrop-blur-md text-amber-100 px-6 py-3 rounded-2xl flex items-center gap-2 border border-amber-400/40 text-sm font-medium transition"
        >
          {showHub ? "✕ Close" : "🗺️ Colony Hub"}
        </button>
      )}

      {/* Colony Hub modal */}
      {loggedIn && showHub && (
        <ColonyHub user={meta!} onClose={() => setShowHub(false)} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <p className="text-amber-200 text-xl animate-pulse">
            Consulting the ancient ledgers…
          </p>
        </div>
      )}

      {/* Landing hero (logged out) */}
      {!isLoading && !loggedIn && <LandingHero />}

      {/* Secret storm toggle */}
      <button
        onClick={() => setStorm(s => !s)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 opacity-0 w-12 h-4"
        aria-hidden="true"
      />
    </main>
  );
}

function ColonyHub({ user, onClose }: { user: UserMeta; onClose: () => void }) {
  const name = user.name?.split(" ")[0] || "Governor";
  const NAV = [
    { href: "/dashboard",    icon: "🏛️", label: "Governor's Office"  },
    { href: "/income",       icon: "📜", label: "Income Ledger"       },
    { href: "/bills",        icon: "📋", label: "Obligations"         },
    { href: "/payments",     icon: "🪙", label: "Payment Hall"        },
    { href: "/achievements", icon: "🏆", label: "Trophy Room"         },
    { href: "/forecast",     icon: "🔭", label: "Treasury Forecast"   },
    { href: "/calendar",     icon: "🗓️", label: "Colonial Calendar"   },
    { href: "/settings",     icon: "⚙️", label: "Settings"            },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-end md:items-center justify-center p-4">
      <div className="bg-[#0a0502] border border-amber-300/40 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center px-8 py-6 border-b border-amber-300/20">
          <div>
            <p className="uppercase tracking-widest text-amber-400 text-xs">Welcome back</p>
            <h2 className="text-4xl font-bold text-amber-100">Governor {name}</h2>
          </div>
          <button onClick={onClose} className="text-4xl text-amber-400 hover:text-white transition">✕</button>
        </div>

        <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {NAV.map(tile => (
            <Link key={tile.href} href={tile.href} onClick={onClose}
                  className="group bg-[#1a120b] hover:bg-[#221a12] border border-amber-300/30 hover:border-amber-400 rounded-2xl p-8 flex flex-col items-center text-center transition-all">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{tile.icon}</div>
              <p className="text-base font-medium text-amber-100">{tile.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function LandingHero() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
      <div className="max-w-lg text-center bg-black/80 backdrop-blur-2xl border border-amber-300/40 rounded-3xl p-12">
        <h1 className="text-5xl md:text-6xl font-bold text-amber-100 mb-6">
          Thy Financial Colony Awaits
        </h1>
        <p className="text-xl text-amber-300 mb-10">
          Track coins. Earn honor. Let Ben guide thee.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup"
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 px-10 rounded-2xl text-lg transition">
            Found Thy Colony
          </Link>
          <Link href="/login"
                className="border-2 border-amber-400/70 hover:bg-amber-400/10 text-amber-100 font-medium py-4 px-10 rounded-2xl text-lg transition">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
