"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    setMessage("Account created. Check your email to confirm signup, then log in.");
    setBusy(false);
  }

  async function handleLogin() {
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    setMessage("Logged in!");
    setBusy(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Start saving your bills, income, spending, and debt securely.
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-zinc-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-zinc-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-zinc-900 p-3 font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {busy ? "Working..." : "Sign Up"}
          </button>
        </form>

        <button
          onClick={handleLogin}
          disabled={busy}
          className="mt-4 w-full rounded-xl border border-zinc-200 p-3 font-semibold hover:bg-zinc-100 disabled:opacity-60"
        >
          {busy ? "Working..." : "Login"}
        </button>

        {message ? (
          <p className="mt-4 text-sm text-zinc-600">{message}</p>
        ) : null}
      </div>
    </main>
  );
}
