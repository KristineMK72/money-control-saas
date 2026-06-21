"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

export default function SettingsPage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [benVoice, setBenVoice] = useState("encouraging");
  const [benAvatar, setBenAvatar] = useState("female_classic");
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState("free");
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [reputation, setReputation] = useState(0);

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");

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
      .select(
        "id, full_name, ben_voice, dark_mode, sound_effects, reduced_motion, is_premium, premium_status, xp, level, reputation, ben_avatar"
      )
      .eq("id", user.id)
      .single<ProfileRow>();

    if (error && error.code !== "PGRST116") {
      setMessage(error.message);
      setLoading(false);
      return;
    }

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

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      ben_voice: benVoice,
      ben_avatar: benAvatar,
      dark_mode: darkMode,
      sound_effects: soundEffects,
      reduced_motion: reducedMotion,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Settings saved, Governor.");
    }

    setSaving(false);
  }

  async function sendPasswordReset() {
    setMessage("");

    if (!email) {
      setMessage("No email found for this account.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password reset email sent.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/20 bg-slate-950/80 p-8">
          Loading settings...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-white">
      <div className="mx-auto grid max-w-4xl gap-6">
        <section className="rounded-3xl border border-white/20 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            Governor Settings
          </p>

          <h1 className="mt-3 text-4xl font-black">Settings</h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
            Manage your account, Ben personality, appearance, sounds, and
            subscription details.
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50">
              {message}
            </div>
          ) : null}
        </section>

        <SettingsPanel title="Governor Profile">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Level" value={String(level)} />
            <StatCard label="XP" value={String(xp)} />
            <StatCard label="Reputation" value={String(reputation)} />
          </div>
        </SettingsPanel>

        <SettingsPanel title="Account">
          <label className="block">
            <span className="text-sm font-black text-white/80">Name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-zinc-950 outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-white/80">Email</span>
            <input
              value={email}
              disabled
              className="mt-2 w-full rounded-xl border border-white/20 bg-white/70 px-4 py-3 font-bold text-zinc-700 outline-none"
            />
          </label>

          <button
            onClick={sendPasswordReset}
            className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-3 font-black text-yellow-100 transition hover:bg-yellow-300/15"
          >
            Send password reset email
          </button>
        </SettingsPanel>

        <SettingsPanel title="Ben Personality">
          <label className="block">
            <span className="text-sm font-black text-white/80">Ben Voice</span>

            <select
              value={benVoice}
              onChange={(e) => setBenVoice(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-zinc-950 outline-none"
            >
              <option value="encouraging">Encouraging Ben</option>
              <option value="funny">Funny Ben</option>
              <option value="direct">Direct Ben</option>
              <option value="governor">Governor Ben</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-black text-white/80">Ben Avatar</span>

            <select
              value={benAvatar}
              onChange={(e) => setBenAvatar(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-zinc-950 outline-none"
            >
              <option value="female_classic">Classic Ben</option>
              <option value="ben_colonial">Colonial Ben</option>
              <option value="ben_mastermind">Mastermind Ben</option>
              <option value="ben_winning">Victory Ben</option>
              <option value="ben_thinking">Thinking Ben</option>
            </select>
          </label>
        </SettingsPanel>

        <SettingsPanel title="Appearance & Experience">
          <Toggle label="Dark Mode" checked={darkMode} onChange={setDarkMode} />
          <Toggle
            label="Sound Effects"
            checked={soundEffects}
            onChange={setSoundEffects}
          />
          <Toggle
            label="Reduced Motion"
            checked={reducedMotion}
            onChange={setReducedMotion}
          />
        </SettingsPanel>

        <SettingsPanel title="Subscription">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
              Current Plan
            </p>

            <p className="mt-2 text-2xl font-black">
              {isPremium ? "AskBen Pro" : "Free"}
            </p>

            <p className="mt-2 text-sm font-semibold text-white/70">
              Status: {premiumStatus || "free"}
            </p>
          </div>

          {!isPremium ? (
            <Link
              href="/upgrade"
              className="inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90"
            >
              Upgrade to Pro
            </Link>
          ) : (
            <Link
              href="/upgrade"
              className="inline-flex rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15"
            >
              Manage plan
            </Link>
          )}
        </SettingsPanel>

        <section className="rounded-3xl border border-white/20 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>

            <Link
              href="/dashboard"
              className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15"
            >
              Back to Dashboard
            </Link>

            <button
              onClick={signOut}
              className="rounded-xl border border-red-300/30 bg-red-500/10 px-5 py-3 font-black text-red-100 transition hover:bg-red-500/20"
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/20 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 p-5 text-left"
    >
      <span className="font-black text-white">{label}</span>

      <span
        className={
          checked
            ? "rounded-full bg-cyan-400 px-4 py-1 text-sm font-black text-black"
            : "rounded-full bg-white/15 px-4 py-1 text-sm font-black text-white/70"
        }
      >
        {checked ? "On" : "Off"}
      </span>
    </button>
  );
}
