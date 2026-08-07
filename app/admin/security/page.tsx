import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin, getSecurityEvents } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const { user, isAdmin } = await requireAdmin();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/dashboard");

  const events = await getSecurityEvents(100);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e2e8f0",
        padding: 24,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
              Security events
            </h1>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 14 }}>
              Bots and suspicious visits from the track endpoint.
            </p>
          </div>
          <Link
            href="/admin/analytics"
            style={{
              color: "#6ee7b7",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            \u2190 Analytics
          </Link>
        </div>

        {events.length === 0 ? (
          <p style={{ color: "#64748b" }}>No events yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>When</th>
                  <th style={{ padding: 8 }}>Type</th>
                  <th style={{ padding: 8 }}>Path</th>
                  <th style={{ padding: 8 }}>Country</th>
                  <th style={{ padding: 8 }}>Score</th>
                  <th style={{ padding: 8 }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr
                    key={ev.id}
                    style={{ borderTop: "1px solid #1e293b" }}
                  >
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, fontWeight: 600 }}>
                      {ev.event_type}
                    </td>
                    <td style={{ padding: 8 }}>{ev.pathname || "\u2014"}</td>
                    <td style={{ padding: 8 }}>{ev.country || "\u2014"}</td>
                    <td style={{ padding: 8 }}>{ev.risk_score ?? "\u2014"}</td>
                    <td style={{ padding: 8 }}>{ev.reason || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
