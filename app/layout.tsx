// layout.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body style={{ /* ... your styles ... */ }}>
        <SupabaseProvider>
          <header style={{ /* ... your styles ... */ }}>
            <div style={{ /* ... your flex container ... */ }}>
              
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Logo and Name */}
                <div style={{ /* ... logo styles ... */ }}>
                  <img src="/ben.png" alt="AskBen" />
                </div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>AskBen</div>
                
                {/* ONLY show greeting if user exists */}
                {user && <UserGreeting />}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <NavLink href="/">Home</NavLink>
                
                {/* ONLY show protected links if logged in */}
                {user ? (
                  <>
                    <NavLink href="/dashboard">Dashboard</NavLink>
                    <NavLink href="/spend">Spend</NavLink>
                    <NavLink href="/income">Income</NavLink>
                    <NavLink href="/bills">Bills</NavLink>
                    <NavLink href="/debt">Debt</NavLink>
                    <NavLink href="/payments">Payments</NavLink>
                    <NavLink href="/forecast">Forecast</NavLink>
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

          {/* Only show the FAB if logged in */}
          {user && (
            <a href="/chat" style={{ /* ... FAB styles ... */ }}>
              Ask Ben 💰
            </a>
          )}

          <footer style={{ /* ... footer styles ... */ }}>
            © 2026 Spatialytics — Built with ❤️ in Minnesota
          </footer>
        </SupabaseProvider>
      </body>
    </html>
  );
}
