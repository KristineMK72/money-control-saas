import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AskBen",
  description: "Financial triage without judgment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
