import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import BenWorldBackground from "@/components/BenWorldBackground";

export const metadata: Metadata = {
  title: "AskBen",
  description: "Financial triage without judgment.",
};

const navLinks = [
  { href: "/world", label: "Franklin's Landing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/spend", label: "Spend" },
  { href: "/bills", label: "Bills" },
  { href: "/debt", label: "Debt" },
  { href: "/payments", label: "Payments" },
  { href: "/forecast", label: "Forecast" },
  { href: "/calendar", label: "Calendar" },
  { href: "/chat", label: "Ask Ben" },
  { href: "/whyben", label: "Why AskBen" },
];

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="app-shell"
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#050505",
          color: "#fff",
        }}
      >
        <BenWorldBackground />

        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            backdropFilter: "blur(18px)",
            background: "rgba(5,5,8,0.75)",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <a
                href="/"
                style={{
                  textDecoration: "none",
                  color: "#fff7ed",
                  fontSize: 32,
                  fontWeight: 900,
                }}
              >
                AskBen 🖋️
              </a>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="/login"
                  style={{
                    padding: "10px 16px",
                    borderRadius: 12,
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
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
                    textDecoration: "none",
                    background: "#22d3ee",
                    color: "#000",
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
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  ⚙️ Settings
                </a>
              </div>
            </div>

            <nav
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingTop: 12,
                paddingBottom: 6,
              }}
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "#fff",
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontWeight: 700,
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <main
          style={{
            position: "relative",
            zIndex: 1,
            minHeight: "70vh",
          }}
        >
          {children}
        </main>

        <a
          href="/chat"
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 9999,
            textDecoration: "none",
            background: "rgba(5,5,8,0.85)",
            color: "#fff7ed",
            padding: "14px 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            fontWeight: 900,
          }}
        >
          Ask Ben 💰
        </a>

        <footer
          style={{
            marginTop: 60,
            padding: "30px 20px",
            textAlign: "center",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "#fef3c7",
            }}
          >
            AskBen 🖋️
          </div>

          <p>
            © 2026 Spatialytics • Financial triage without judgment
          </p>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <a href="/privacy">Privacy</a>
            <a href="/security">Security</a>
            <a href="/terms">Terms</a>
            <a href="/whyben">Why AskBen</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
