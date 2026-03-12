import "./globals.css";
import type { Metadata } from "next";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "AskBen — Financial Triage",
  description: "Stop financial chaos. See exactly what to pay first.",
  metadataBase: new URL("https://www.askben.buzz"),
  openGraph: {
    title: "AskBen",
    description: "AI financial triage. Know what bill to pay first.",
    url: "https://www.askben.buzz/",
    siteName: "AskBen",
    type: "website",
    images: [
      {
        url: "https://www.askben.buzz/askben-social.jpg",
        width: 1200,
        height: 630,
        alt: "AskBen financial triage app",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AskBen",
    description: "AI financial triage. Know what bill to pay first.",
    images: ["https://www.askben.buzz/askben-social.jpg"],
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
        }}
      >
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
            gap: 16,
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: "#1c1917",
              whiteSpace: "nowrap",
            }}
          >
            AskBen
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
            <NavLink href="/chat">Ask Ben</NavLink>
            <NavLink href="/forecast">Forecast</NavLink>
            <NavLink href="/signup">Signup / Login</NavLink>
            <LogoutButton />
          </div>
        </div>

        {children}

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
