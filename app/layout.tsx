import "./globals.css";
import type { Metadata } from "next";
import LogoutButton from "@/components/LogoutButton";
import BenPersona from "@/components/BenPersona";
import Image from "next/image";

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
  },
  twitter: {
    card: "summary_large_image",
    title: "AskBen",
    description: "AI financial triage. Know what bill to pay first.",
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
      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
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
      <body className="bg-zinc-50 text-zinc-900">

        {/* HEADER */}
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                <Image
                  src="/ben-head.png"
                  alt="AskBen"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              <div className="text-2xl font-black">
                AskBen
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/chat">Ask Ben</NavLink>
              <NavLink href="/forecast">Forecast</NavLink>
              <NavLink href="/signup">Signup / Login</NavLink>
              <LogoutButton />
            </div>

          </div>
        </header>

        {/* BEN PERSONALITY BAR */}
        <div className="mx-auto max-w-7xl px-4 py-4">
          <BenPersona />
        </div>

        {/* PAGE CONTENT */}
        {children}

        {/* FLOATING CHAT BUTTON */}
        <a
          href="/chat"
          className="fixed bottom-6 right-6 z-50 rounded-full bg-zinc-900 px-6 py-3 font-bold text-white shadow-lg"
        >
          Ask Ben 💰
        </a>

        {/* FOOTER */}
        <footer className="mt-16 text-center text-sm text-zinc-500 pb-8">
          © 2026 Spatialytics — Built with ❤️ in Minnesota
        </footer>

      </body>
    </html>
  );
}
