"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BenWorldMap from "@/components/BenWorldMap";
import BenWorldWeatherOverlay from "@/components/BenWorldWeatherOverlay";
import TreasuryCoinMenu from "@/components/TreasuryCoinMenu";
import StreakBadge from "@/components/StreakBadge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UserMeta = { name: string | null };

export default function WorldPage() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<UserMeta | null | "loading">("loading");
  const [showHub, setShowHub] = useState(false);
  const [storm, setStorm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single()
          .then(({ data: p }) => setUser({ name: p?.full_name ?? null }));
      } else {
        setUser(null);
      }
    });
  }, [supabase]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const isLoading = user === "loading";
  const loggedIn = user !== null && user !== "loading";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080706]">
      {/* Full-bleed immersive map */}
      <div className="absolute inset-0 z-0">
        <BenWorldMap />
      </div>

      <BenWorldWeatherOverlay fog storm={storm} />

      {/* Minimal Top HUD */}
      <div className="absolute top-3 left-3 right-3 z-50 flex justify-between items-center pointer-events-auto">
        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-amber-300/30">
          <img src="/ben-head.png" alt="Ben" className="w-9 h-9" />
          <div>
            <div className="text-xl font-bold text-amber-100">AskBen</div>
            <div className="text-xs text-amber-400 -mt-1">Franklin's Landing</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loggedIn && <StreakBadge />}
          <button
            onClick={toggleFullscreen}
            className="bg-black/70 hover:bg-black/90 backdrop-blur-md text-amber-100 px-5 py-2.5 rounded-2xl text-sm border border-amber-300/30 transition"
          >
            {isFullscreen ? "Exit" : "Full"} Screen
          </button>
        </div>
      </div>

      {/* Treasury Coin Menu */}
      <TreasuryCoinMenu />

      {/* Floating Ask Ben Button */}
      <Link
        href="/chat"
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-br from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-4 rounded-3xl flex items-center gap-3 shadow-2xl border border-amber-300/50 text-lg font-medium active:scale-95 transition-all"
      >
        Ask Ben <span className="text-2xl">💰</span>
      </Link>

      {/* Floating Hub Toggle (for logged-in users) */}
      {loggedIn && (
        <button
          onClick={() => setShowHub(!showHub)}
          className="fixed bottom-8 left-8 z-50 bg-black/70 hover:bg-black/90 backdrop-blur-md text-amber-100 px-6 py-3 rounded-2xl flex items-center gap-2 border border-amber-400/40 text-sm font-medium"
        >
          {showHub ? "✕ Close Hub" : "🗺️ Colony Hub"}
        </button>
      )}

      {/* Collapsible Colony Hub */}
      {loggedIn && showHub && <ColonyHub user={user as UserMeta} onClose={() => setShowHub(false)} />}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <p className="text-amber-200 text-xl animate-pulse">
            Consulting the ancient ledgers...
          </p>
        </div>
      )}

      {/* Logged-out landing */}
      {!isLoading && !loggedIn && <LandingHero />}
    </main>
  );
}

/* ====================== COLONY HUB ====================== */
function ColonyHub({ user, onClose }: { user: UserMeta; onClose: () => void }) {
  const name = user.name?.split(" ")[0] || "Governor";

  const NAV_TILES = [
    { href: "/dashboard", icon: "🏛️", label: "Governor's Office" },
    { href: "/income", icon: "📜", label: "Income Ledger" },
    { href: "/bills", icon: "📋", label: "Obligations" },
    { href: "/payments", icon: "🪙", label: "Payment Hall" },
    { href: "/achievements", icon: "🏆", label: "Trophy Room" },
    { href: "/forecast", icon: "🔭", label: "Treasury Forecast" },
    { href: "/calendar", icon: "🗓️", label: "Colonial Calendar" },
    { href: "/settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-end md:items-center justify-center p-4">
      <div className="bg-[#0a0502] border border-amber-300/40 rounded-3xl w-full max-w-4xl max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-amber-300/20">
          <div>
            <p className="uppercase tracking-widest text-amber-400 text-xs">Welcome back</p>
            <h2 className="text-4xl font-bold text-amber-100">Governor {name}</h2>
          </div>
          <button onClick={onClose} className="text-4xl text-amber-400 hover:text-white">✕</button>
        </div>

        {/* Navigation Grid */}
        <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {NAV_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              onClick={onClose}
              className="group bg-[#1a120b] hover:bg-[#221a12] border border-amber-300/30 hover:border-amber-400 rounded-2xl p-8 flex flex-col items-center text-center transition-all"
            >
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {tile.icon}
              </div>
              <p className="text-xl font-medium text-amber-100">{tile.label}</p>
            </Link>
          ))}
        </div>

        {/* Footer quote */}
        <div className="px-8 py-6 border-t border-amber-300/20 text-center text-amber-400/70 italic">
          “Beware of little expenses; a small leak will sink a great ship.” — Benjamin Franklin
        </div>
      </div>
    </div>
  );
}

/* ====================== LOGGED-OUT HERO ====================== */
function LandingHero() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 pointer-events-auto">
      <div className="max-w-lg text-center bg-black/80 backdrop-blur-2xl border border-amber-300/40 rounded-3xl p-12">
        <h1 className="text-5xl md:text-6xl font-bold text-amber-100 mb-6">Thy Financial Colony Awaits</h1>
        <p className="text-xl text-amber-300 mb-10">
          Track coins. Earn honor. Let Ben guide thee.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 px-10 rounded-2xl text-lg transition"
          >
            Found Thy Colony
          </Link>
          <Link
            href="/login"
            className="border-2 border-amber-400/70 hover:bg-amber-400/10 text-amber-100 font-medium py-4 px-10 rounded-2xl text-lg transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
