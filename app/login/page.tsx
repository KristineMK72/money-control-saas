// app/login/page.tsx
"use client";

import { useFormState } from "react-dom";
import { loginAction } from "../actions/auth";

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-zinc-400">Sign in to your account</p>
        </div>

        <form action={formAction} className="space-y-6">
          <input
            type="email"
            name="email"
            defaultValue="kakr0901@icloud.com"
            placeholder="Email address"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
            required
          />

          {state?.error && (
            <p className="text-red-400 text-sm text-center">{state.error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-cyan-400 py-3.5 font-semibold text-black hover:bg-cyan-300 transition"
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Don't have an account?{" "}
          <a href="/signup" className="text-cyan-300 hover:underline">
            Sign up free
          </a>
        </p>
      </div>
    </div>
  );
}
