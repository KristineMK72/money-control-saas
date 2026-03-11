import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Triage",
  description: "Stop financial chaos. See exactly what to pay first.",
};

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
        {children}

        {/* Floating AI assistant */}
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
            letterSpacing: 0.2,
          }}
        >
          Ask Ben 💰
        </a>
      </body>
    </html>
  );
}
