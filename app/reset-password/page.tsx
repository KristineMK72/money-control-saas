"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [checkingLink, setCheckingLink] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    prepareRecoverySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function prepareRecoverySession() {
    setCheckingLink(true);
    setMessage("");

    const code = searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(
          "This reset link is invalid or expired. Please request a new password reset email.",
        );
      }
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage(
          "No active reset session found. Please request a new password reset email.",
        );
      }
    }

    setCheckingLink(false);
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setSaving(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated. You can now sign in.");
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-10 text-white">
      <section className="mx-auto max-w-lg rounded-3xl border border-white/20 bg-slate-950/85 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
          New Password
        </p>

        <h1 className="mt-3 text-4xl font-black">Reset Password</h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
          Choose a new password for your AskBen account.
        </p>

        {checkingLink ? (
          <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50">
            Checking reset link...
          </div>
        ) : null}

        <form onSubmit={updatePassword} className="mt-6 grid gap-4">
          <label>
            <span className="text-sm font-black text-white/80">
              New Password
            </span>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={checkingLink}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-zinc-950 outline-none disabled:opacity-60"
            />
          </label>

          <label>
            <span className="text-sm font-black text-white/80">
              Confirm Password
            </span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={checkingLink}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-zinc-950 outline-none disabled:opacity-60"
            />
          </label>

          {message ? (
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving || checkingLink}
            className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Password"}
          </button>

          <Link
            href="/forgot-password"
            className="text-center text-sm font-black text-yellow-200 hover:underline"
          >
            Request a new reset link
          </Link>

          <Link
            href="/login"
            className="text-center text-sm font-black text-yellow-200 hover:underline"
          >
            Back to login
          </Link>
        </form>
      </section>
    </main>
  );
}
