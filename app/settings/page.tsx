"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BEN_PERSONAS } from "@/lib/ben/personas";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getSoundPreferences,
  initAudio,
  playCoins,
  playError,
  playBell,
  setSoundEnabled,
  setSoundVolume,
} from "@/lib/sounds";

const SMITHY_BG = "/055F883D-453E-4D8A-8A8A-9DE9A309F58B.png";

type ProfileRow = {
  id: string;
  full_name?: string | null;
  ben_voice?: string | null;
  dark_mode?: boolean | null;
  sound_effects?: boolean | null;
  reduced_motion?: boolean | null;
  is_premium?: boolean | null;
  premium_status?: string | null;
  xp?: number | null;
  level?: number | null;
  reputation?: number | null;
  ben_avatar?: string | null;
};

function getColonialRank(reputation: number) {
  if (reputation >= 5000) return "Defender of the Treasury";
  if (reputation >= 2500) return "Founding Financier";
  if (reputation >= 1000) return "Governor";
  if (reputation >= 500) return "Colonial Magistrate";
  if (reputation >= 250) return "Treasury Keeper";
  if (reputation >= 100) return "Town Recorder";
  return "Apprentice Clerk";
}

const PANEL: React.CSSProperties = {
  background: "rgba(8,5,3,0.9)",
  border: "1px solid rgba(201,168,76,0.38)",
  borderRadius: "1.25rem",
  backdropFilter: "blur(8px)",
  boxShadow: "0 18px 70px rgba(0,0,0,.45)",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "#f5e6c8",
  color: "#2d1810",
  border: "1px solid rgba(201,168,76,0.6)",
  borderRadius: "0.75rem",
  padding: "0.75rem 0.9rem",
  fontFamily: "EB Garamond, serif",
  fontSize: "15px",
  outline: "none",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-cinzel font-bold uppercase tracking-widest text-[#c9a84c]">
      {children}
    </p>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.28)" }}>
      <p className="font-cinzel text-[10px] uppercase tracking-widest text-[#9a7d5a]">{label}</p>
      <p className="font-cinzel text-2xl font-bold text-[#c9a84c]">{value}</p>
      {sub && <p className="text-[10px] text-[#9a7d5a]">{sub}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  playFeedback = true,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  playFeedback?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onChange(!checked);
        if (playFeedback) playBell();
      }}
      className="flex w-full items-center justify-between rounded-xl px-4 py-3"
      style={{ background: "rgba(107,68,35,.14)", border: "1px solid rgba(201,168,76,.22)" }}
    >
      <span className="font-cinzel text-sm font-bold text-[#f5e6c8]">{label}</span>
      <span
        className="rounded-full px-4 py-1 text-xs font-bold"
        style={{
          background: checked ? "#c9a84c" : "rgba(0,0,0,.35)",
          color: checked ? "#1a0f0a" : "#9a7d5a",
          border: "1px solid rgba(201,168,76,.3)",
        }}
      >
        {checked ? "On" : "Off"}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [benVoice, setBenVoice] = useState("encouraging");
  const [benAvatar, setBenAvatar] = useState("female_classic");
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [soundVolume, setSoundVolumeState] = useState(70);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState("free");
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [reputation, setReputation] = useState(0);

  useEffect(() => {
    const preferences = getSoundPreferences();
    setSoundVolumeState(Math.round(preferences.volume * 100));
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);
    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, ben_voice, dark_mode, sound_effects, reduced_motion, is_premium, premium_status, xp, level, reputation, ben_avatar")
      .eq("user_id", user.id)
      .maybeSingle<ProfileRow>();

    if (error && error.code !== "PGRST116") {
      setMessage(error.message);
      setMsgType("err");
      setLoading(false);
      return;
    }

    if (data) {
      setFullName(data.full_name ?? "");
      setBenVoice(data.ben_voice ?? "encouraging");
      setBenAvatar(data.ben_avatar ?? "female_classic");
      setDarkMode(data.dark_mode ?? false);
      setSoundEffects(data.sound_effects ?? true);
      setSoundEnabled(data.sound_effects ?? true);
      setReducedMotion(data.reduced_motion ?? false);
      setIsPremium(data.is_premium ?? false);
      setPremiumStatus(data.premium_status ?? "free");
      setXp(data.xp ?? 0);
      setLevel(data.level ?? 1);
      setReputation(data.reputation ?? 0);
    }

    setLoading(false);
  }

  async function saveSettings() {
    if (!userId) return;
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      full_name: fullName,
      ben_voice: benVoice,
      ben_avatar: benAvatar,
      dark_mode: darkMode,
      sound_effects: soundEffects,
      reduced_motion: reducedMotion,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      playError();
      setMessage(error.message);
      setMsgType("err");
    } else {
      playCoins();
      setMessage("Settings saved in the Smithy.");
      setMsgType("ok");
    }

    setSaving(false);
  }

  async function sendPasswordReset() {
    if (!email) {
      setMessage("No email found for this account.");
      setMsgType("err");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
      setMsgType("err");
    } else {
      setMessage("Password reset dispatched to thy inbox.");
      setMsgType("ok");
    }
  }

  async function exportData() {
    setExporting(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `askben-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Thy data export is ready.");
      setMsgType("ok");
      playCoins();
    } catch (err) {
      playError();
      setMessage(err instanceof Error ? err.message : "Export failed");
      setMsgType("err");
    }
    setExporting(false);
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Permanently delete your AskBen account and financial data? This cannot be undone."
    );
    if (!confirmed) return;

    const typed = window.prompt('Type DELETE to confirm account deletion');
    if (typed !== "DELETE") {
      setMessage("Deletion cancelled.");
      setMsgType("err");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(body.error || "Delete failed");
      window.location.href = "/login";
    } catch (err) {
      playError();
      setMessage(err instanceof Error ? err.message : "Delete failed");
      setMsgType("err");
      setDeleting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const rank = getColonialRank(reputation);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-cinzel text-[#c9a84c]">Stoking the Smithy fire…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-[#f5e6c8]" style={{ fontFamily: "EB Garamond, serif" }}>
      <section className="relative mx-auto max-w-5xl">
        <img src={SMITHY_BG} alt="Smithy" className="block h-auto w-full" />

        <button
          onClick={() => router.push("/world")}
          className="absolute left-4 top-4 rounded-full px-4 py-2 text-sm"
          style={{ background: "rgba(0,0,0,.72)", border: "1px solid rgba(201,168,76,.45)" }}
        >
          ← Back to Town
        </button>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-28 -mt-3 sm:-mt-10">
        <div className="p-4 sm:p-5" style={PANEL}>
          <div className="mb-5 text-center">
            <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-[#c9a84c]">Governor Settings</p>
            <h1 className="font-cinzel text-4xl font-bold text-[#f5e6c8]">The Smithy</h1>
            <p className="text-sm italic text-[#d6c09a]">Forge thy account, Ben’s voice, and colony experience.</p>
          </div>

          {message && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-center text-sm font-cinzel"
              style={{
                background: msgType === "ok" ? "rgba(201,168,76,.12)" : "rgba(248,113,113,.12)",
                border: msgType === "ok" ? "1px solid rgba(201,168,76,.35)" : "1px solid rgba(248,113,113,.35)",
                color: msgType === "ok" ? "#c9a84c" : "#f87171",
              }}
            >
              {msgType === "ok" ? "✦" : "⚠"} {message}
            </div>
          )}

          <div className="mb-5 grid grid-cols-3 gap-3">
            <MiniStat label="Level" value={String(level)} sub={`Rank ${level}`} />
            <MiniStat label="XP" value={xp.toLocaleString()} />
            <MiniStat label="Reputation" value={reputation.toLocaleString()} sub={rank} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(201,168,76,.28)", background: "rgba(0,0,0,.45)" }}>
              <h2 className="mb-3 font-cinzel text-lg font-bold text-[#c9a84c]">Account</h2>

              <div className="space-y-3">
                <div>
                  <Label>Governor Name</Label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter thy name" style={INPUT} />
                </div>

                <div>
                  <Label>Email Address</Label>
                  <input value={email} disabled style={{ ...INPUT, background: "#e8d5b7", opacity: 0.75 }} />
                </div>

                <button
                  onClick={sendPasswordReset}
                  className="w-full rounded-xl px-5 py-3 font-cinzel font-bold text-[#c9a84c]"
                  style={{ background: "rgba(107,68,35,.18)", border: "1px solid rgba(201,168,76,.35)" }}
                >
                  ✉ Dispatch Password Reset
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(201,168,76,.28)", background: "rgba(0,0,0,.45)" }}>
              <h2 className="mb-3 font-cinzel text-lg font-bold text-[#c9a84c]">Ben Personality</h2>

              <div className="space-y-3">
                <div>
                  <Label>Ben’s Voice</Label>
                  <select value={benVoice} onChange={(e) => setBenVoice(e.target.value)} style={INPUT}>
                    {BEN_PERSONAS.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.emoji} {persona.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Ben’s Avatar</Label>
                  <select value={benAvatar} onChange={(e) => setBenAvatar(e.target.value)} style={INPUT}>
                    <option value="female_classic">🎩 Classic Ben</option>
                    <option value="ben_colonial">🏛 Colonial Ben</option>
                    <option value="ben_mastermind">🧠 Mastermind Ben</option>
                    <option value="ben_winning">🏆 Victory Ben</option>
                    <option value="ben_thinking">💭 Thinking Ben</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(201,168,76,.28)", background: "rgba(0,0,0,.45)" }}>
              <h2 className="mb-3 font-cinzel text-lg font-bold text-[#c9a84c]">Experience</h2>
              <div className="space-y-3">
                <Toggle label="Dark Mode" checked={darkMode} onChange={setDarkMode} />
                <Toggle
                  label="Sound Effects"
                  checked={soundEffects}
                  playFeedback={false}
                  onChange={(on) => {
                    setSoundEffects(on);
                    setSoundEnabled(on);
                    if (on) {
                      void initAudio().then((ready) => {
                        if (ready) playBell();
                      });
                    }
                  }}
                />
                <label className="block rounded-xl px-4 py-3" style={{ background: "rgba(107,68,35,.14)", border: "1px solid rgba(201,168,76,.22)" }}>
                  <span className="flex items-center justify-between font-cinzel text-sm font-bold text-[#f5e6c8]">
                    <span>Sound Volume</span>
                    <span className="text-[#c9a84c]">{soundVolume}%</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={soundVolume}
                    disabled={!soundEffects}
                    aria-label="Sound volume"
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setSoundVolumeState(next);
                      setSoundVolume(next / 100);
                    }}
                    onPointerUp={() => playBell()}
                    className="mt-3 w-full accent-[#c9a84c] disabled:opacity-40"
                  />
                </label>
                <button
                  type="button"
                  disabled={!soundEffects}
                  onClick={() => {
                    void initAudio().then((ready) => {
                      if (ready) playCoins();
                    });
                  }}
                  className="w-full rounded-xl px-4 py-3 font-cinzel text-sm font-bold text-[#c9a84c] disabled:opacity-40"
                  style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)" }}
                >
                  ♪ Test Town Sounds
                </button>
                <Toggle label="Reduced Motion" checked={reducedMotion} onChange={setReducedMotion} />
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(201,168,76,.28)", background: "rgba(0,0,0,.45)" }}>
              <h2 className="mb-3 font-cinzel text-lg font-bold text-[#c9a84c]">Subscription</h2>

              <div className="rounded-xl p-4" style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.25)" }}>
                <p className="font-cinzel text-xs uppercase tracking-widest text-[#9a7d5a]">Current Plan</p>
                <p className="font-cinzel text-2xl font-bold text-[#c9a84c]">{isPremium ? "✦ AskBen Pro" : "Free Colony"}</p>
                <p className="text-xs italic text-[#9a7d5a]">Status: {premiumStatus || "free"}</p>
              </div>

              <Link
                href="/signup?plan=monthly"
                className="mt-3 flex w-full justify-center rounded-xl px-5 py-3 font-cinzel font-bold"
                style={{ background: isPremium ? "rgba(107,68,35,.2)" : "#c9a84c", color: isPremium ? "#c9a84c" : "#1a0f0a" }}
              >
                {isPremium ? "Manage Plan" : "✦ Upgrade to Pro"}
              </Link>
            </div>

            <div className="rounded-2xl p-4 md:col-span-2" style={{ border: "1px solid rgba(201,168,76,.28)", background: "rgba(0,0,0,.45)" }}>
              <h2 className="mb-2 font-cinzel text-lg font-bold text-[#c9a84c]">Privacy & Data</h2>
              <p className="mb-4 text-sm text-[#d6c09a]">
                Export a copy of thy financial records, or permanently delete thy account data.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void exportData()}
                  disabled={exporting}
                  className="rounded-xl px-5 py-3 font-cinzel font-bold text-[#c9a84c] disabled:opacity-50"
                  style={{ background: "rgba(107,68,35,.18)", border: "1px solid rgba(201,168,76,.35)" }}
                >
                  {exporting ? "Preparing export…" : "⬇ Export My Data"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAccount()}
                  disabled={deleting}
                  className="rounded-xl px-5 py-3 font-cinzel font-bold text-[#f87171] disabled:opacity-50"
                  style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.35)" }}
                >
                  {deleting ? "Deleting…" : "🗑 Delete Account"}
                </button>
              </div>
              <p className="mt-3 text-xs italic text-[#9a7d5a]">
                Deletion requires typing DELETE. Advice is educational, not professional financial advice.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="rounded-xl py-4 font-cinzel text-lg font-bold disabled:opacity-50"
              style={{ background: "#166534", border: "1px solid #4ade80" }}
            >
              {saving ? "Saving…" : "✦ Save Settings"}
            </button>

            <Link
              href="/dashboard"
              className="rounded-xl py-4 text-center font-cinzel text-lg font-bold"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}
            >
              ← Dashboard
            </Link>

            <button
              onClick={signOut}
              className="rounded-xl py-4 font-cinzel text-lg font-bold text-[#f87171]"
              style={{ border: "1px solid rgba(248,113,113,.35)", background: "rgba(248,113,113,.08)" }}
            >
              Sign Out
            </button>
          </div>

          <p className="mt-6 text-center italic text-[#c9a84c]">
            “Beware of little expenses; a small leak will sink a great ship.” — Benjamin Franklin
          </p>
        </div>
      </section>
    </main>
  );
}
