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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
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
      }}
    >
      {children}
    </Link>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();

  // ⭐ FIXED: use getSession() instead of getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f5f5f4",
          color: "#18181b",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <SupabaseProvider>
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              background: "#fff",
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
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#0f172a",
                  }}
                >
                  <img
                    src="/ben.png"
                    alt="AskBen"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>AskBen</div>
                {user && <UserGreeting />}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
              </div>
            </div>
          </header>

          <main>{children}</main>
          <InstallBanner />
          <footer
            style={{
              marginTop: 60,
              textAlign: "center",
              fontSize: 12,
              color: "#71717a",
            }}
          >
            © 2026 Spatialytics — Built with ❤️ in Minnesota
          </footer>
        </SupabaseProvider>
      </body>
    </html>
  );
}
