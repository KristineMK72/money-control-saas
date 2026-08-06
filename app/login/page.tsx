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
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    const requested = new URLSearchParams(window.location.search).get("next");
    const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/world";
    router.push(destination);
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
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          padding: 28,
          borderRadius: 28,
          background: "rgba(15,23,42,0.92)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          textAlign: "center",
        }}
      >
        <img
          src="/ben-head.png"
          alt="Ben"
          style={{
            width: 140,
            margin: "0 auto 12px",
            display: "block",
          }}
        />

        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            marginBottom: 6,
          }}
        >
          Welcome Back
        </h1>

        <p
          style={{
            opacity: 0.75,
            marginBottom: 22,
            fontWeight: 700,
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
          }}
        >
          <input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: -4,
            }}
          >
            <a
              href="/forgot-password"
              style={{
                color: "#67e8f9",
                fontSize: 14,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Forgot password?
            </a>
          </div>

          {error ? (
            <div
              style={{
                color: "#fecaca",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 14,
                padding: 12,
                fontSize: 14,
                fontWeight: 800,
                textAlign: "left",
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "16px",
              borderRadius: 14,
              border: "none",
              background: "#22c55e",
              color: "#000000",
              fontWeight: 900,
              fontSize: 20,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <a
          href="/signup"
          style={{
            display: "inline-flex",
            marginTop: 20,
            color: "#60a5fa",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Need an account? Sign up →
        </a>
      </section>

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
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: 14,
  border: "2px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  fontSize: 18,
  fontWeight: 700,
  outline: "none",
  WebkitTextFillColor: "#111827",
  WebkitAppearance: "none",
  appearance: "none",
  caretColor: "#2563eb",
};
