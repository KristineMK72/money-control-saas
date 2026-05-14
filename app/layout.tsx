import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, IM_Fell_English } from "next/font/google";

import LogoutButton from "@/components/LogoutButton";
import BenPersona from "@/components/BenPersona";
import UserGreeting from "@/components/UserGreeting";
import InstallBanner from "@/components/InstallBanner";
import AppInitializer from "@/components/AppInitializer";
import BenWorldBackground from "@/components/BenWorldBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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

export const metadata: Metadata = { ... }; // (unchanged - keeping your existing metadata)

export const viewport: Viewport = { ... }; // (unchanged)

const navLinks = [ ... ]; // (unchanged)

function NavLink({ ... }) { ... } // (unchanged)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              background: "linear-gradient(180deg, rgba(5,5,8,0.78), rgba(5,5,8,0.32))",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
            }}
          >
            {/* ... your existing header content (unchanged) ... */}
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

          {/* === INLINE INSTALL BANNER - Clean & Non-intrusive === */}
          <div className="max-w-4xl mx-auto px-4">
            <InstallBanner />
          </div>

          {/* Floating Ask Ben Button - kept as is */}
          <a
            href="/chat"
            aria-label="Ask Ben"
            style={{
              position: "fixed",
              bottom: 22,
              right: 18,
              background: "rgba(5,5,8,0.78)",
              color: "#fff7ed",
              padding: "14px 18px",
              borderRadius: 999,
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "0 14px 40px rgba(0,0,0,0.42)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              zIndex: 9999,
              fontSize: 15,
              fontFamily: "var(--font-cormorant), Georgia, serif",
              letterSpacing: "0.4px",
            }}
          >
            Ask Ben 💰
          </a>

          <footer
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: 60,
              padding: "24px 20px 34px",
              textAlign: "center",
              fontSize: 13,
              color: "rgba(255,255,255,0.62)",
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 18,
                fontWeight: 800,
                color: "#fff7ed",
              }}
            >
              AskBen 🖋️
            </div>

            <div style={{ marginTop: 4 }}>
              © 2026 Spatialytics — Built with ❤️ in Minnesota
            </div>

            <div
              style={{
                marginTop: 6,
                fontFamily: "var(--font-im-fell), Georgia, serif",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Spend wisely.
            </div>
          </footer>
        </AppInitializer>
      </body>
    </html>
  );
}
