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

export const metadata: Metadata = {
  title: "AskBen - Financial Triage",
  description: "Stop financial chaos. See exactly what to pay first.",
  metadataBase: new URL("https://www.askben.buzz"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/ben-head.png", sizes: "192x192", type: "image/png" },
      { url: "/ben-head.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/ben-head.png",
  },
  openGraph: {
    title: "AskBen",
    description: "AI financial triage. Know what bill to pay first.",
    url: "https://www.askben.buzz/",
    siteName: "AskBen",
    type: "website",
    images: [
      {
        url: "/askben-social.jpeg",
        width: 1200,
        height: 630,
        alt: "AskBen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AskBen",
    description: "AI financial triage. Know what bill to pay first.",
    images: ["/askben-social.jpeg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/world", label: "Franklin’s Landing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/spend", label: "Spend" },
  { href: "/income", label: "Income" },
  { href: "/income-plan", label: "Income Plan" },
  { href: "/bills", label: "Bills" },
  { href: "/debt", label: "Debt" },
  { href: "/payments", label: "Payments" },
  { href: "/forecast", label: "Forecast" },
  { href: "/calendar", label: "Calendar" },
  { href: "/credit-health", label: "Credit Health" },
  { href: "/credit-recovery", label: "Credit Recovery" },
  { href: "/crisis", label: "Crisis" },
  { href: "/chat", label: "Ask Ben" },
  { href: "/settings", label: "⚙️ Settings" },
  { href: "/whyben", label: "Why AskBen" },
  { href: "/dispute-letter", label: "Dispute Letter" },
  { href: "/goodwill-letter", label: "Goodwill Letter" },
];

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
        WebkitBackdropFilter: "blur(12px)",
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
        WebkitBackdropFilter: "blur(14px)",
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
          display: "flex",
          flexDirection: "column",
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

                {/* Right side controls */}
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

          <main style={{ 
            position: "relative", 
            zIndex: 1, 
            flex: "1 1 auto",
            minHeight: "60vh"
          }}>
            {children}
          </main>

          <div className="max-w-4xl mx-auto px-4">
            <InstallBanner />
          </div>

          {/* Floating Ask Ben Button */}
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
              WebkitBackdropFilter: "blur(16px)",
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

          {/* Footer - Now properly pushed down */}
          <footer
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: "auto",
              marginLeft: "auto",
              marginRight: "auto",
              marginBottom: 40,
              maxWidth: 1000,
              padding: "32px 22px",
              textAlign: "center",
              fontSize: 13,
              color: "#f8fafc",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.9))",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 28,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 22px 70px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
              width: "100%",
            }}
          >
            <img
              src="/ben-head.png"
              alt="AskBen"
              style={{
                width: 88,
                height: 88,
                objectFit: "contain",
                margin: "0 auto 14px",
                display: "block",
                borderRadius: 24,
                background: "rgba(255,255,255,0.94)",
                border: "1px solid rgba(251,191,36,0.35)",
                padding: 8,
                boxShadow: "0 14px 35px rgba(0,0,0,0.35)",
              }}
            />

            <div
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 24,
                fontWeight: 900,
                color: "#fef3c7",
                letterSpacing: "0.04em",
              }}
            >
              AskBen 🖋️
            </div>

            <div
              style={{
                marginTop: 6,
                color: "rgba(255,255,255,0.86)",
                fontWeight: 700,
              }}
            >
              © 2026 Spatialytics — Built with ❤️ in Minnesota
            </div>

            <div
              style={{
                marginTop: 8,
                fontFamily: "var(--font-im-fell), Georgia, serif",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#fcd34d",
              }}
            >
              Spend wisely.
            </div>

            <div
              style={{
                margin: "18px auto 0",
                maxWidth: 720,
                padding: "14px 18px",
                borderRadius: 18,
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
                color: "#fde68a",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.7,
              }}
            >
              🏛️ Secure login • Encrypted connection • No bank login required •
              Your finances remain under your control
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {["Privacy", "Security", "Terms", "Why AskBen", "Settings"].map(
                (label) => {
                  const href =
                    label === "Privacy"
                      ? "/privacy"
                      : label === "Security"
                        ? "/security"
                        : label === "Terms"
                          ? "/terms"
                          : label === "Settings"
                            ? "/settings"
                            : "/whyben";

                  return (
                    <a
                      key={href}
                      href={href}
                      style={{
                        color: "#fff7ed",
                        textDecoration: "none",
                        padding: "8px 10px",
                        borderRadius: 999,
                        background:
                          href === "/whyben" || href === "/settings"
                            ? "rgba(251,191,36,0.12)"
                            : "rgba(255,255,255,0.08)",
                        border:
                          href === "/whyben" || href === "/settings"
                            ? "1px solid rgba(251,191,36,0.22)"
                            : "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {label}
                    </a>
                  );
                }
              )}
            </div>
          </footer>
        </AppInitializer>
      </body>
    </html>
  );
}
