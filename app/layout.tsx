import "./globals.css";
import type { Metadata, Viewport } from "next";
import LogoutButton from "@/components/LogoutButton";
import BenPersona from "@/components/BenPersona";
import UserGreeting from "@/components/UserGreeting";
import InstallBanner from "@/components/InstallBanner";
import AppInitializer from "@/components/AppInitializer";
import BenWorldBackground from "@/components/BenWorldBackground";

export const metadata: Metadata = {
  title: "AskBen — Financial Triage",
  description: "Stop financial chaos. See exactly what to pay first.",
  metadataBase: new URL("https://www.askben.buzz"),
  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/ben-head.png", sizes: "192x192", type: "image/png" },
      { url: "/ben-head.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
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
  { href: "/dispute-letter", label: "Dispute Letter" },
  { href: "/goodwill-letter", label: "Goodwill Letter" },
  { href: "/chat", label: "Ask Ben" },
  { href: "/signup", label: "Signup / Login" },
];

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
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
        fontWeight: 700,
        fontSize: 15,
        color: "rgba(255,255,255,0.96)",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        whiteSpace: "nowrap",
        boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
        letterSpacing: "0.35px",
        fontFamily:
          '"Cinzel", "Cormorant Garamond", Georgia, Times, serif',
      }}
    >
      {children}
    </a>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="app-shell"
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            '"Cormorant Garamond", Georgia, "Times New Roman", serif',
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
              background:
                "linear-gradient(180deg, rgba(5,5,8,0.72), rgba(5,5,8,0.28))",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                maxWidth: 1180,
                margin: "0 auto",
                padding: "12px 14px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <a
                  href="/dashboard"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textDecoration: "none",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/ben.png"
                      alt="AskBen"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 28,
                        lineHeight: 1,
                        color: "#fff7ed",
                        whiteSpace: "nowrap",
                        textShadow: "0 3px 18px rgba(0,0,0,0.75)",
                        fontFamily:
                          '"Cinzel", "Cormorant Garamond", Georgia, serif',
                        letterSpacing: "1px",
                      }}
                    >
                      AskBen
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.68)",
                        fontWeight: 600,
                        letterSpacing: "0.4px",
                      }}
                    >
                      Financial triage, with judgment.
                    </div>
                  </div>
                </a>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <UserGreeting />
                  <LogoutButton />
                </div>
              </div>

              <nav
                aria-label="AskBen navigation"
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  overflowX: "auto",
                  flexWrap: "nowrap",
                  width: "100%",
                  padding: "2px 0 8px",
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

          <InstallBanner />

          <a
            href="/chat"
            aria-label="Ask Ben"
            style={{
              position: "fixed",
              bottom: 22,
              right: 18,
              background: "rgba(5,5,8,0.74)",
              color: "#fff7ed",
              padding: "14px 18px",
              borderRadius: 999,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 14px 40px rgba(0,0,0,0.42)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              zIndex: 9999,
              fontSize: 15,
              fontFamily:
                '"Cinzel", "Cormorant Garamond", Georgia, serif',
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
              color: "rgba(255,255,255,0.58)",
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            © 2026 Spatialytics — Built with ❤️ in Minnesota
          </footer>
        </AppInitializer>
      </body>
    </html>
  );
}
