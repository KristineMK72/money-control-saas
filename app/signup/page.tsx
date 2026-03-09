"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email to confirm signup.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged in!");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
        <h1 className="text-2xl font-black">Create account</h1>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-zinc-200 p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-zinc-200 p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="w-full rounded-xl bg-zinc-900 text-white p-3 font-semibold">
            Sign Up
          </button>
        </form>

        <button
          onClick={handleLogin}
          className="mt-4 w-full rounded-xl border border-zinc-200 p-3 font-semibold"
        >
          Login
        </button>

        {message && (
          <p className="mt-4 text-sm text-zinc-600">{message}</p>
        )}
      </div>
    </main>
  );
}
