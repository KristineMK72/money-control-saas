"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault();

    setSending(true);
    setMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage("Enter your email first, Governor.");
      setSending(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: "https://www.askben.buzz/reset-password",
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password reset link sent. Check your email.");
    }

    setSending(false);
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-10 text-white">
      <section className="mx-auto max-w-lg rounded-3xl border border-white/20 bg-slate-950/85 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
          Account Recovery
        </p>

        <h1 className="mt-3 text-4xl font-black">Forgot Password?</h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
          Enter your email and Ben will send you a secure reset link.
        </p>

        <form onSubmit={sendResetLink} className="mt-6 grid gap-4">
          <label>
            <span className="text-sm font-black text-white/80">Email</span>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-zinc-950 outline-none"
            />
          </label>

          {message ? (
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Reset Link"}
          </button>

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
