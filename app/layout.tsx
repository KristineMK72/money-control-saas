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
      <body>{children}</body>
    </html>
  );
}
