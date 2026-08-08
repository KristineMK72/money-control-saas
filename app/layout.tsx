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
import { VisitorTracker } from "@/components/VisitorTracker"; // adjust path if needed

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
  adjustFontFallback: false,
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

// Strict Clean Menu: Income-plan and Debt are GONE. benworld mapped cleanly to Franklin's Landing.
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/world", label: "Franklin’s Landing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/spend", label: "Spend" },
  { href: "/income", label: "Income" },
  { href: "/bills", label: "Bills" },
  { href: "/payments", label: "Payments" },
  { href: "/forecast", label: "Forecast" },
  { href: "/calendar", label: "Calendar" },
  { href: "/chat", label: "Ask Ben" },
  { href: "/settings", label: "⚙️ Settings" },
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
        <VisitorTracker />
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
                  {/* NOTE: Make sure to check inside this component file to match the arrays! */}
                  <MobileMenu />
                  
                  <div className="hidden sm:block">
                    <UserGreeting />
                  </div>

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

          <details
  style={{
    position: "fixed",
    top: 92,
    right: 14,
    zIndex: 9998,
  }}
>
  <summary
    style={{
      listStyle: "none",
      cursor: "pointer",
      padding: "10px 14px",
      borderRadius: 999,
      background: "rgba(5,5,8,.9)",
      color: "#fff7ed",
      border: "1px solid rgba(255,255,255,.2)",
      fontWeight: 900,
    }}
  >
    🏛️ Status
  </summary>

  <div
    style={{
      marginTop: 10,
      width: "min(92vw, 520px)",
      maxHeight: "70vh",
      overflowY: "auto",
    }}
  >
    <GovernorHeader />
  </div>
</details>

<details
  style={{
    position: "fixed",
    top: 144,
    right: 14,
    zIndex: 9998,
  }}
>
  <summary
    style={{
      listStyle: "none",
      cursor: "pointer",
      padding: "10px 14px",
      borderRadius: 999,
      background: "rgba(5,5,8,.9)",
      color: "#fff7ed",
      border: "1px solid rgba(255,255,255,.2)",
      fontWeight: 900,
    }}
  >
    🪶 Ben
  </summary>

  <div
    style={{
      marginTop: 10,
      width: "min(92vw, 620px)",
      maxHeight: "70vh",
      overflowY: "auto",
    }}
  >
    <GlobalBenAdvisor />
  </div>
</details>

          <main style={{ 
            position: "relative", 
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

          {/* Squeaky Clean Short Footer + Return of Spend Wisely */}
          <footer
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: "auto",
              marginLeft: "auto",
              marginRight: "auto",
              marginBottom: 24,
              maxWidth: 900,
              padding: "20px 24px",
              textAlign: "center",
              fontSize: 12,
              color: "#f8fafc",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              width: "calc(100% - 32px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div style={{ textAlign: "left" }}>
                <span
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#fef3c7",
                    letterSpacing: "0.02em",
                  }}
                >
                  AskBen 🖋️
                </span>
                
                {/* Spend Wisely is Back! */}
                <span
                  style={{
                    marginLeft: 14,
                    fontFamily: "var(--font-im-fell), Georgia, serif",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#fcd34d",
                    fontSize: 11,
                    fontWeight: 600
                  }}
                >
                  Spend wisely.
                </span>
              </div>

              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                © 2026 Spatialytics — MN
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 11.5,
                }}
              >
                {["Privacy", "Terms", "Why AskBen"].map((label) => {
                  const href =
                    label === "Privacy"
                      ? "/privacy"
                      : label === "Terms"
                        ? "/terms"
                        : "/whyben";

                  return (
                    <a
                      key={href}
                      href={href}
                      style={{
                        color: "#fff7ed",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </a>
                  );
                })}
              </div>
            </div>
          </footer>
        </AppInitializer>
      </body>
    </html>
  );
}
