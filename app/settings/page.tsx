"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { playCoins, playError, playBell } from "@/lib/sounds";

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
  if (reputation >= 500)  return "Colonial Magistrate";
  if (reputation >= 250)  return "Treasury Keeper";
  if (reputation >= 100)  return "Town Recorder";
  return "Apprentice Clerk";
}

/* ─── UI primitives ─────────────────────────────────────────────── */

const CARD: React.CSSProperties = {
  background:     "rgba(15,8,4,0.88)",
  border:         "1px solid rgba(107,68,35,0.5)",
  backdropFilter: "blur(4px)",
  borderRadius:   "0.75rem",
  padding:        "1.5rem",
};

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={CARD}>
      <div className="mb-5 pb-3" style={{ borderBottom: "1px solid rgba(107,68,35,0.3)" }}>
        <h2 className="font-cinzel text-lg font-bold" style={{ color: "#c9a84c" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5 italic" style={{ color: "#9a7d5a" }}>{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4 text-center"
         style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.35)" }}>
      <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold"
         style={{ color: "#9a7d5a" }}>{label}</p>
      <p className="mt-1 text-3xl font-bold font-cinzel" style={{ color: "#c9a84c" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5 font-cinzel" style={{ color: "#6b4423" }}>{sub}</p>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-widest font-cinzel font-semibold mb-1.5"
       style={{ color: "#9a7d5a" }}>{children}</p>
  );
}

const INPUT: React.CSSProperties = {
  width: "100%", background: "#f5e6c8", color: "#2d1810",
  border: "1px solid rgba(201,168,76,0.5)", borderRadius: "0.5rem",
  padding: "0.625rem 0.875rem", fontFamily: "EB Garamond, serif", fontSize: "15px",
  outline: "none",
};

const INPUT_DISABLED: React.CSSProperties = {
  ...INPUT, background: "#e8d5b7", color: "#6b4423", opacity: 0.7,
};

function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => { playBell(); onChange(!checked); }}
            className="w-full flex items-center justify-between rounded-xl p-4 text-left transition"
            style={{ background: "rgba(107,68,35,0.12)", border: "1px solid rgba(107,68,35,0.35)" }}>
      <div>
        <p className="font-cinzel text-sm font-bold" style={{ color: "#e8d5b7" }}>{label}</p>
        {description && <p className="text-xs mt-0.5 italic" style={{ color: "#6b4423" }}>{description}</p>}
      </div>
      <div className="shrink-0 ml-4 rounded-full px-4 py-1 text-xs font-cinzel font-bold transition"
           style={checked
             ? { background: "#c9a84c", color: "#1a0f0a" }
             : { background: "rgba(107,68,35,0.25)", color: "#9a7d5a",
                 border: "1px solid rgba(107,68,35,0.4)" }}>
        {checked ? "On" : "Off"}
      </div>
    </button>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const supabase = createSupabaseBrowserClient();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [userId,   setUserId]   = useState("");
  const [email,    setEmail]    = useState("");
  const [message,  setMessage]  = useState("");
  const [msgType,  setMsgType]  = useState<"ok" | "err">("ok");

  const [fullName,       setFullName]       = useState("");
  const [benVoice,       setBenVoice]       = useState("encouraging");
  const [benAvatar,      setBenAvatar]      = useState("female_classic");
  const [darkMode,       setDarkMode]       = useState(false);
  const [soundEffects,   setSoundEffects]   = useState(true);
  const [reducedMotion,  setReducedMotion]  = useState(false);
  const [isPremium,      setIsPremium]      = useState(false);
  const [premiumStatus,  setPremiumStatus]  = useState("free");
  const [xp,             setXp]             = useState(0);
  const [level,          setLevel]          = useState(1);
  const [reputation,     setReputation]     = useState(0);

  useEffect(() => { void loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true); setMessage("");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { window.location.href = "/login"; return; }
    setUserId(user.id);
    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, ben_voice, dark_mode, sound_effects, reduced_motion, is_premium, premium_status, xp, level, reputation, ben_avatar")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (error && error.code !== "PGRST116") { setMessage(error.message); setMsgType("err"); setLoading(false); return; }

    if (data) {
      setFullName(data.full_name ?? "");
      setBenVoice(data.ben_voice ?? "encouraging");
      setBenAvatar(data.ben_avatar ?? "female_classic");
      setDarkMode(data.dark_mode ?? false);
      setSoundEffects(data.sound_effects ?? true);
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
    setSaving(true); setMessage("");
    const { error } = await supabase.from("profiles").upsert({
      id: userId, full_name: fullName, ben_voice: benVoice, ben_avatar: benAvatar,
      dark_mode: darkMode, sound_effects: soundEffects, reduced_motion: reducedMotion,
      updated_at: new Date().toISOString(),
    });
    if (error) { playError(); setMessage(error.message); setMsgType("err"); }
    else        { playCoins(); setMessage("Settings saved, Governor."); setMsgType("ok"); }
    setSaving(false);
  }

  async function sendPasswordReset() {
    setMessage("");
    if (!email) { setMessage("No email found for this account."); setMsgType("err"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setMessage(error.message); setMsgType("err"); }
    else        { setMessage("Password reset dispatched to thy inbox."); setMsgType("ok"); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const rank = getColonialRank(reputation);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ben-bank bg-cover bg-center">
        <div style={{ ...CARD, padding: "2rem 3rem", textAlign: "center" }}>
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>
            Opening the Governor&rsquo;s records&hellip;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ben-bank bg-cover bg-center bg-fixed"
         style={{ fontFamily: "EB Garamond, serif" }}>
      <div className="min-h-screen pb-28" style={{ background: "rgba(10,5,2,0.72)" }}>
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="pt-4 pb-2">
            <p className="text-xs uppercase tracking-[0.2em] font-cinzel font-semibold"
               style={{ color: "#6b4423" }}>Governor Settings</p>
            <h1 className="font-cinzel text-4xl font-bold mt-1" style={{ color: "#c9a84c" }}>
              Settings
            </h1>
            <p className="mt-1 text-sm italic" style={{ color: "#9a7d5a" }}>
              Manage thy account, Ben&rsquo;s personality, appearance, and subscription.
            </p>
          </div>

          {/* ── Notice ── */}
          {message && (
            <div className="rounded-xl px-4 py-3 text-sm font-cinzel"
                 style={{
                   background: msgType === "ok" ? "rgba(201,168,76,0.08)" : "rgba(248,113,113,0.08)",
                   border: `1px solid ${msgType === "ok" ? "rgba(201,168,76,0.35)" : "rgba(248,113,113,0.35)"}`,
                   color: msgType === "ok" ? "#c9a84c" : "#f87171",
                 }}>
              {msgType === "ok" ? "✦" : "⚠"} {message}
            </div>
          )}

          {/* ── Governor Profile ── */}
          <Section title="Governor Profile" subtitle="Thy rank, XP, and standing in the colony">
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Level"      value={String(level)} sub={`Rank ${level}`} />
              <StatTile label="XP"         value={xp.toLocaleString()} />
              <StatTile label="Reputation" value={reputation.toLocaleString()} sub={rank} />
            </div>
            {/* XP progress hint */}
            <div className="rounded-xl px-4 py-3"
                 style={{ background: "rgba(107,68,35,0.12)", border: "1px solid rgba(107,68,35,0.3)" }}>
              <p className="text-xs italic text-center" style={{ color: "#9a7d5a" }}>
                🪶 &ldquo;{rank}&rdquo; &mdash; earn XP by logging income, paying bills, and tracking debts
              </p>
            </div>
          </Section>

          {/* ── Account ── */}
          <Section title="Account" subtitle="Thy identity in the ledger">
            <div>
              <FieldLabel>Governor Name</FieldLabel>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                     placeholder="Enter thy name" style={INPUT} />
            </div>
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <input value={email} disabled style={INPUT_DISABLED} />
            </div>
            <button onClick={sendPasswordReset}
                    className="rounded-xl px-5 py-2.5 text-sm font-cinzel font-bold transition"
                    style={{ background: "rgba(107,68,35,0.2)", border: "1px solid rgba(201,168,76,0.35)",
                             color: "#c9a84c" }}>
              Dispatch Password Reset
            </button>
          </Section>

          {/* ── Ben Personality ── */}
          <Section title="Ben Personality" subtitle="Shape how thy advisor speaks to thee">
            <div>
              <FieldLabel>Ben&rsquo;s Voice</FieldLabel>
              <select value={benVoice} onChange={e => setBenVoice(e.target.value)} style={INPUT}>
                <option value="encouraging">🌟 Encouraging Ben</option>
                <option value="funny">😄 Funny Ben</option>
                <option value="direct">⚡ Direct Ben</option>
                <option value="governor">🏛 Governor Ben</option>
              </select>
            </div>
            <div>
              <FieldLabel>Ben&rsquo;s Avatar</FieldLabel>
              <select value={benAvatar} onChange={e => setBenAvatar(e.target.value)} style={INPUT}>
                <option value="female_classic">🎩 Classic Ben</option>
                <option value="ben_colonial">🏛 Colonial Ben</option>
                <option value="ben_mastermind">🧠 Mastermind Ben</option>
                <option value="ben_winning">🏆 Victory Ben</option>
                <option value="ben_thinking">💭 Thinking Ben</option>
              </select>
            </div>
          </Section>

          {/* ── Appearance ── */}
          <Section title="Appearance & Experience" subtitle="How the colony feels to thee">
            <Toggle label="Dark Mode"       description="Deepen the colonial ambiance"
                    checked={darkMode}      onChange={setDarkMode} />
            <Toggle label="Sound Effects"   description="Coins, bells, and fanfares"
                    checked={soundEffects}  onChange={setSoundEffects} />
            <Toggle label="Reduced Motion"  description="Fewer animations throughout"
                    checked={reducedMotion} onChange={setReducedMotion} />
          </Section>

          {/* ── Subscription ── */}
          <Section title="Subscription" subtitle="Thy standing with the colonial treasury">
            <div className="rounded-xl p-5"
                 style={{
                   background: isPremium ? "rgba(201,168,76,0.1)" : "rgba(107,68,35,0.12)",
                   border: `1px solid ${isPremium ? "rgba(201,168,76,0.5)" : "rgba(107,68,35,0.4)"}`,
                 }}>
              <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold"
                 style={{ color: "#9a7d5a" }}>Current Plan</p>
              <p className="mt-1 font-cinzel text-2xl font-bold"
                 style={{ color: isPremium ? "#c9a84c" : "#e8d5b7" }}>
                {isPremium ? "✦ AskBen Pro" : "Free Colony"}
              </p>
              <p className="text-xs mt-0.5 italic" style={{ color: "#6b4423" }}>
                Status: {premiumStatus || "free"}
              </p>
            </div>

            {!isPremium ? (
              <Link href="/upgrade"
                    className="inline-flex rounded-xl px-6 py-3 text-sm font-cinzel font-bold transition"
                    style={{ background: "#c9a84c", color: "#1a0f0a" }}>
                ✦ Upgrade to Pro
              </Link>
            ) : (
              <Link href="/upgrade"
                    className="inline-flex rounded-xl px-6 py-3 text-sm font-cinzel font-bold transition"
                    style={{ background: "rgba(107,68,35,0.2)", border: "1px solid rgba(107,68,35,0.4)",
                             color: "#9a7d5a" }}>
                Manage Plan
              </Link>
            )}
          </Section>

          {/* ── Actions ── */}
          <div style={CARD}>
            <div className="flex flex-wrap gap-3">
              <button onClick={saveSettings} disabled={saving}
                      className="rounded-xl px-6 py-3 text-sm font-cinzel font-bold transition disabled:opacity-50"
                      style={{ background: "#2d5a27", color: "#f5e6c8", border: "1px solid #4a8a42" }}>
                {saving ? "Saving…" : "✦ Save Settings"}
              </button>

              <Link href="/dashboard"
                    className="inline-flex rounded-xl px-5 py-3 text-sm font-cinzel font-bold transition"
                    style={{ background: "rgba(107,68,35,0.2)", border: "1px solid rgba(107,68,35,0.4)",
                             color: "#9a7d5a" }}>
                ← Back to Dashboard
              </Link>

              <button onClick={signOut}
                      className="rounded-xl px-5 py-3 text-sm font-cinzel font-bold transition ml-auto"
                      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
                               color: "#f87171" }}>
                Sign Out
              </button>
            </div>
          </div>

          {/* ── Quote ── */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3"
               style={{ background: "rgba(245,230,200,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              &ldquo;Beware of little expenses; a small leak will sink a great ship.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
