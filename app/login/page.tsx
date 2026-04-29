"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // Force a full reload so the server picks up the new cookie
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">AskBen</h1>
          <p className="mt-2 text-zinc-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-cyan-400 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:border-cyan-400 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-cyan-400 py-3.5 font-semibold text-black hover:bg-cyan-300 transition"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
