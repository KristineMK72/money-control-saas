import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Cormorant_Garamond, IM_Fell_English } from "next/font/google";

import LogoutButton from "@/components/LogoutButton";
import BenPersona from "@/components/BenPersona";
import UserGreeting from "@/components/UserGreeting";
import InstallBanner from "@/components/InstallBanner";
import AppInitializer from "@/components/AppInitializer";
import BenWorldBackground from "@/components/BenWorldBackground";
import MobileMenu from "@/components/MobileMenu";
import GovernorHeader from "@/components/GovernorHeader";
import GlobalBenAdvisor from "@/components/GlobalBenAdvisor";
import SwipeHeader from "@/components/SwipeHeader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});
const imFell = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-im-fell",
});

export const metadata: Metadata = { /* ... same as before ... */ };
export const viewport: Viewport = { themeColor: "#050505" };

const navLinks = [ /* ... your navLinks array unchanged ... */ ];

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "9px 16px",
        borderRadius: 999,
        textDecoration: "none",
        fontWeight: 800,
        fontSize: 15,
        color: "rgba(255,255,255,0.96)",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.2)",
        backdropFilter: "blur(12px)",
        whiteSpace: "nowrap",
        boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
        letterSpacing: "0.35px",
        fontFamily: "var(--font-cormorant), Georgia, serif",
      }}
    >
      {children}
    </a>
  );
}

function HeaderIconLink({
  href,
  label,
  title,
}: {
  href: string;
  label: string;
  title: string;
}) {
  return (
    <a
      href={href}
      aria-label={title}
      title={title}
      style={{
        width: 48,
        height: 48,
        display: "grid",
        placeItems: "center",
        borderRadius: 16,
        textDecoration: "none",
        color: "#fff7ed",
        background: "rgba(5,5,8,0.75)",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        backdropFilter: "blur(14px)",
        fontSize: 21,
        fontWeight: 900,
        flexShrink: 0,
      }}
    >
      {label}
    </a>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${cormorant.variable} ${imFell.variable} app-shell`}
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          color: "#f8fafc",
          background: "#050505",
        }}
      >
        <BenWorldBackground />

        <AppInitializer>
          <SwipeHeader>
            <div
              style={{
                maxWidth: 1180,
                margin: "0 auto",
                padding: "12px 16px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
              }}
            >
              {/* Top Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {/* Logo */}
                <a
                  href="/dashboard"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textDecoration: "none",
                    minWidth: 0,
                    flexShrink: 1,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      overflow: "hidden",
                      background: "rgba(0,0,0,0.65)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    <img
                      src="/ben.png"
                      alt="AskBen"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: -4,
                        bottom: -4,
                        width: 24,
                        height: 24,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 999,
                        background: "rgba(255,247,237,0.95)",
                        border: "1px solid rgba(120,53,15,0.4)",
                        fontSize: 14,
                        boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                      }}
                    >
                      🖋️
                    </span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 900,
                        fontSize: "clamp(26px, 5.5vw, 32px)",
                        lineHeight: 1,
                        color: "#fff7ed",
                        whiteSpace: "nowrap",
                        textShadow: "0 3px 18px rgba(0,0,0,0.8)",
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        letterSpacing: "0.7px",
                      }}
                    >
                      AskBen
                      <span aria-hidden="true" style={{ fontSize: "0.75em", opacity: 0.9 }}>
                        🕯️
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(12px, 2.8vw, 13.5px)",
                        color: "rgba(255,255,255,0.75)",
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                        fontFamily: "var(--font-im-fell), Georgia, serif",
                      }}
                    >
                      Financial triage, without judgment.
                    </div>
                  </div>
                </a>

                {/* Controls */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <HeaderIconLink href="/settings" label="⚙️" title="Settings" />
                  <MobileMenu />
                  <div className="hidden sm:block">
                    <UserGreeting />
                  </div>

                  <a
                    href="/login"
                    style={{
                      padding: "11px 20px",
                      borderRadius: 999,
                      textDecoration: "none",
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#fff",
                      background: "rgba(5,5,8,0.8)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.35)",
                      backdropFilter: "blur(14px)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Login
                  </a>

                  <LogoutButton />
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav
                aria-label="AskBen navigation"
                className="hidden md:flex"
                style={{
                  gap: 8,
                  alignItems: "center",
                  overflowX: "auto",
                  padding: "4px 0",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                }}
              >
                {navLinks.map((link) => (
                  <NavLink key={link.href} href={link.href}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <BenPersona />
          </SwipeHeader>

          <GovernorHeader />
          <GlobalBenAdvisor />

          <main style={{ position: "relative", zIndex: 1, minHeight: "70vh" }}>
            {children}
          </main>

          <div className="max-w-4xl mx-auto px-4">
            <InstallBanner />
          </div>

          {/* Floating Action Button */}
          <a
            href="/chat"
            aria-label="Ask Ben"
            style={{
              position: "fixed",
              bottom: 24,
              right: 20,
              background: "rgba(5,5,8,0.85)",
              color: "#fff7ed",
              padding: "14px 22px",
              borderRadius: 999,
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.22)",
              backdropFilter: "blur(16px)",
              zIndex: 9999,
              fontSize: 15.5,
              fontFamily: "var(--font-cormorant), Georgia, serif",
              letterSpacing: "0.4px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Ask Ben 💰
          </a>

          {/* Footer */}
          <footer
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: 80,
              marginLeft: "auto",
              marginRight: "auto",
              marginBottom: 40,
              maxWidth: 1000,
              padding: "32px 22px",
              textAlign: "center",
              fontSize: 13,
              color: "#f8fafc",
              background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.9))",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 28,
              backdropFilter: "blur(20px)",
              boxShadow: "0 22px 70px rgba(0,0,0,0.5)",
            }}
          >
            {/* Footer content unchanged for now */}
            {/* ... (your existing footer JSX) ... */}
          </footer>
        </AppInitializer>
      </body>
    </html>
  );
}
