import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Triage",
  description: "Stop financial chaos. See exactly what to pay first.",

  openGraph: {
    title: "Financial Triage",
    description: "Stop financial chaos. See exactly what to pay first.",
    url: "https://money-control-saas.vercel.app",
    siteName: "Financial Triage",
    images: [
      {
        url: "/ben.png",
        width: 1200,
        height: 630,
        alt: "Ben AI financial assistant",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Financial Triage",
    description: "Stop financial chaos. See exactly what to pay first.",
    images: ["/ben.png"],
  },
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
        }}
      >
        {/* Top navigation */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "#ffffff",
            borderBottom: "1px solid #e7e5e4",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: "#1c1917",
            }}
          >
            Financial Triage
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/chat">Ask Ben</NavLink>
          </div>
        </div>

        {children}

        {/* Floating Ask Ben button */}
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
      </body>
    </html>
  );
}
