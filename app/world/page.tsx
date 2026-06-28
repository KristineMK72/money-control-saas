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

  const isLoading = user === "loading";
  const loggedIn = user !== null && user !== "loading";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080706] font-serif">
      {/* Full-bleed immersive map */}
      <div className="absolute inset-0 z-0">
        <BenWorldMap />
      </div>

      {/* Subtle atmospheric overlay */}
      <BenWorldWeatherOverlay fog storm={storm} />

      {/* Minimal Top HUD */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-amber-300/30 shadow-xl">
            <img src="/ben-head.png" alt="Benjamin Franklin" className="w-9 h-9" />
            <div>
              <div className="text-2xl font-bold text-amber-100 tracking-tight">AskBen</div>
              <div className="text-xs text-amber-400/80 -mt-1">Franklin's Landing</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loggedIn && <StreakBadge />}
          
          {loggedIn && (
            <button
              onClick={() => setShowHub(!showHub)}
              className="bg-amber-900/90 hover:bg-amber-800 transition-all text-amber-100 px-6 py-3 rounded-2xl flex items-center gap-2 border border-amber-400/40 font-medium"
            >
              {showHub ? "✕ Hide Controls" : "🗺️ Colony Hub"}
            </button>
          )}
        </div>
      </div>

      {/* Floating Treasury Coin */}
      <TreasuryCoinMenu />

      {/* Floating Ask Ben Button */}
      <Link
        href="/chat"
        className="fixed bottom-8 right-8 z-40 bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white px-8 py-4 rounded-3xl flex items-center gap-3 shadow-2xl border border-amber-300/50 text-lg font-medium transition-all active:scale-95"
      >
        Ask Ben <span className="text-2xl">💰</span>
      </Link>

      {/* Collapsible Colony Hub */}
      {loggedIn && showHub && (
        <ColonyHub user={user as UserMeta} onClose={() => setShowHub(false)} />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <p className="text-amber-200 text-xl font-medium animate-pulse">
            Consulting the ancient ledgers...
          </p>
        </div>
      )}

      {/* Logged-out Landing Hero (if needed) */}
      {!isLoading && !loggedIn && (
        <LandingHero onStormToggle={() => setStorm((s) => !s)} />
      )}
    </main>
  );
}

/* ====================== COLLAPSIBLE HUB ====================== */
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
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4">
      <div className="bg-[#0f0a05] border border-amber-300/40 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-300/20 px-8 py-6">
          <div>
            <p className="text-amber-400 text-sm tracking-widest">WELCOME BACK</p>
            <h2 className="text-4xl font-bold text-amber-100">Governor {name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-200 text-3xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Navigation Grid */}
        <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {NAV_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              onClick={onClose}
              className="group bg-[#1a140f] hover:bg-[#221c16] border border-amber-300/30 hover:border-amber-400 rounded-2xl p-6 transition-all duration-200 flex flex-col items-center text-center"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {tile.icon}
              </div>
              <p className="font-medium text-amber-100 text-lg">{tile.label}</p>
            </Link>
          ))}
        </div>

        {/* Footer Quote */}
        <div className="px-8 py-6 border-t border-amber-300/20 text-center text-amber-400/80 italic text-sm">
          “Beware of little expenses; a small leak will sink a great ship.” — Benjamin Franklin
        </div>
      </div>
    </div>
  );
}

/* ====================== LOGGED-OUT HERO ====================== */
function LandingHero({ onStormToggle }: { onStormToggle: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-auto">
      <div className="max-w-xl text-center bg-black/80 backdrop-blur-xl border border-amber-300/30 rounded-3xl p-10">
        <h1 className="text-6xl font-bold text-amber-100 mb-4">Thy Financial Colony Awaits</h1>
        <p className="text-xl text-amber-300/90 mb-8">
          Track thy coins. Earn honor. Let Ben guide thee.
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
            className="border border-amber-400/60 hover:bg-amber-400/10 text-amber-100 font-medium py-4 px-10 rounded-2xl text-lg transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
