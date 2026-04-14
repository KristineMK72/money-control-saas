import "./globals.css";
import type { Metadata, Viewport } from "next";
import LogoutButton from "@/components/LogoutButton";
import BenPersona from "@/components/BenPersona";
import UserGreeting from "@/components/UserGreeting";
import InstallBanner from "@/components/InstallBanner";

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
  },

  twitter: {
    card: "summary_large_image",
    title: "AskBen",
    description: "AI financial triage. Know what bill to pay first.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

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
        padding: "8px 14px",
        borderRadius: 999,
        textDecoration: "none",
        fontWeight: 600,
        color: "#1c1917",
        fontSize: 14,
        border: "1px solid #e7e5e4",
        background: "#fff",
        whiteSpace: "nowrap",
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
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#f5f5f4",
          color: "#18181b",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "#ffffff",
            borderBottom: "1px solid #e7e5e4",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#0f172a",
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

              <div
                style={{
                  fontWeight: 900,
                  fontSize: 24,
                  color: "#111827",
                  whiteSpace: "nowrap",
                }}
              >
                AskBen
              </div>

              <UserGreeting />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <NavLink href="/">Home</NavLink>
                <NavLink href="/dashboard">Dashboard</NavLink>

                {/* CORE APP AREAS */}
                  <NavLink href="/spend">Spend</NavLink>
                  <NavLink href="/income">Income</NavLink>
                  <NavLink href="/bills">Bills</NavLink>
                  <NavLink href="/debt">Debt</NavLink>
                  <NavLink href="/payments">Payments</NavLink>

                {/* INTELLIGENCE */}
                  <NavLink href="/forecast">Forecast</NavLink>
                  <NavLink href="/chat">Ask Ben</NavLink>

                {/* AUTH */}
                    <NavLink href="/signup">Signup / Login</NavLink>

                <LogoutButton />
        </div>
          </div>

          <BenPersona />
        </header>

        <main>{children}</main>

        <InstallBanner />

        <a
          href="/chat"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#111827",
            color: "#fff",
            padding: "14px 18px",
            borderRadius: 999,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
            zIndex: 9999,
            fontSize: 15,
          }}
        >
          Ask Ben 💰
        </a>

        <footer
          style={{
            marginTop: 60,
            padding: "20px",
            textAlign: "center",
            fontSize: 12,
            color: "#71717a",
          }}
        >
          © 2026 Spatialytics — Built with ❤️ in Minnesota
        </footer>
      </body>
    </html>
  );
}
