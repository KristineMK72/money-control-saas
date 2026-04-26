"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-3xl font-bold">Login</h1>

      <input
        type="email"
        placeholder="Email"
        className="mt-6 w-full rounded-lg bg-white/10 p-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="mt-3 w-full rounded-lg bg-white/10 p-3"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="mt-3 text-red-400">{error}</p>}

      <button
        onClick={handleLogin}
        className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
      >
        Login
      </button>

      <p className="mt-4 text-sm text-white/50">
        Need an account?{" "}
        <a href="/signup" className="text-cyan-300 underline">
          Create one free
        </a>
      </p>
    </div>
  );
}
