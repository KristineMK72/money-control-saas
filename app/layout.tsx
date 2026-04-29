import "./globals.css";
import type { Metadata, Viewport } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseProvider } from "@/lib/supabase/provider";
import LogoutButton from "@/components/LogoutButton";
import UserGreeting from "@/components/UserGreeting";
import InstallBanner from "@/components/InstallBanner";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AskBen — Financial Triage",
  description: "Stop financial chaos. See exactly what to pay first.",
  metadataBase: new URL("https://www.askben.buzz"),
};

export const viewport: Viewport = { themeColor: "#0f172a" };

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-full text-sm font-semibold border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 transition"
    >
      {children}
    </Link>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        <SupabaseProvider initialSession={session}>
          {/* HEADER */}
          <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 text-zinc-900">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900">
                  <img
                    src="/ben.png"
                    alt="AskBen"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="text-xl font-black">AskBen</div>

                {user && (
                  <div className="hidden md:block">
                    <UserGreeting />
                  </div>
                )}
              </div>

              <nav className="flex items-center gap-2">
                <NavLink href="/">Home</NavLink>

                {user ? (
                  <>
                    <NavLink href="/dashboard">Dashboard</NavLink>
                    <NavLink href="/chat">Ask Ben</NavLink>
                    <LogoutButton />
                  </>
                ) : (
                  <>
                    <NavLink href="/signup">Signup</NavLink>
                    <NavLink href="/login">Login</NavLink>
                  </>
                )}
              </nav>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="min-h-screen">{children}</main>

          <InstallBanner />

          {/* FOOTER */}
          <footer className="mt-20 text-center text-xs text-zinc-500 py-6">
            © 2026 Spatialytics — Built with ❤️ in Minnesota
          </footer>
        </SupabaseProvider>
      </body>
    </html>
  );
}
