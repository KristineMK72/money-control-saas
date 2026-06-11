"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SubscriptionOptions from "@/components/SubscriptionOptions";
export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        background: "#0f172a",
        color: "#ffffff",
        padding: "20px",
      }}
    >
      <img
        src="/ben-head.png"
        alt="Ben"
        style={{
          width: 140,
          marginBottom: 12,
        }}
      />
      <h1
        style={{
          fontSize: 36,
          fontWeight: 800,
          marginBottom: 6,
        }}
      >
        Welcome Back
      </h1>
      <p
        style={{
          opacity: 0.75,
          marginBottom: 20,
        }}
      >
        Sign in to AskBen
      </p>
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: "100%",
          maxWidth: 420,
        }}
      >
        <input
          type="email"
          placeholder="Email address"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "16px",
            borderRadius: 14,
            border: "2px solid #2563eb",
            background: "#ffffff",
            color: "#111827",
            fontSize: 18,
            fontWeight: 500,
            outline: "none",
            WebkitTextFillColor: "#111827",
            WebkitAppearance: "none",
            appearance: "none",
            caretColor: "#2563eb",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "16px",
            borderRadius: 14,
            border: "2px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            fontSize: 18,
            fontWeight: 500,
            outline: "none",
            WebkitTextFillColor: "#111827",
            WebkitAppearance: "none",
            appearance: "none",
            caretColor: "#2563eb",
          }}
        />
        {error && (
          <div
            style={{
              color: "#fca5a5",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "16px",
            borderRadius: 14,
            border: "none",
            background: "#22c55e",
            color: "#000000",
            fontWeight: 800,
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <section
        style={{
          width: "100%",
          maxWidth: 720,
          marginTop: 36,
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          Premium Options
        </h2>
        <SubscriptionOptions />
      </section>
      <a
        href="/signup"
        style={{
          marginTop: 24,
          color: "#60a5fa",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Need an account? Sign up →
      </a>
    </main>
  );
}
