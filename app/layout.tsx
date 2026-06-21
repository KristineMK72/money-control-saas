import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import BenWorldBackground from "@/components/BenWorldBackground";

export const metadata: Metadata = {
  title: "AskBen",
  description: "Financial triage without judgment.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-shell">
        <BenWorldBackground />

        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            backdropFilter: "blur(16px)",
            background: "rgba(5,5,5,0.75)",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                color: "#fff",
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              AskBen 🖋️
            </a>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <a
                href="/login"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Login
              </a>

              <a
                href="/signup"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "#22d3ee",
                  color: "#000",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Sign Up
              </a>

              <a
                href="/settings"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                ⚙️
              </a>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
