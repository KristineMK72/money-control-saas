import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminSecurityPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  const { data: visitors } = await supabase
    .from("visitors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const totalVisitors = visitors?.length || 0;
  const bots = visitors?.filter((v) => v.is_bot).length || 0;
  const suspicious = visitors?.filter((v) => v.is_suspicious).length || 0;

  return (
    <main style={{ padding: 24, color: "white" }}>
      <h1>Admin Security + Analytics</h1>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div>
          <h2>{totalVisitors}</h2>
          <p>Recent Visitors</p>
        </div>

        <div>
          <h2>{bots}</h2>
          <p>Bots Detected</p>
        </div>

        <div>
          <h2>{suspicious}</h2>
          <p>Suspicious Visits</p>
        </div>
      </section>

      <h2 style={{ marginTop: 32 }}>Recent Visitors</h2>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Page</th>
              <th>Location</th>
              <th>Risk</th>
              <th>Bot</th>
              <th>Reason</th>
            </tr>
          </thead>

          <tbody>
            {visitors?.map((v) => (
              <tr key={v.id}>
                <td>{new Date(v.created_at).toLocaleString()}</td>
                <td>{v.pathname}</td>
                <td>
                  {[v.city, v.region, v.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td>{v.risk_score}</td>
                <td>{v.is_bot ? "Yes" : "No"}</td>
                <td>{v.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32 }}>Security Events</h2>

      <div style={{ display: "grid", gap: 12 }}>
        {events?.map((event) => (
          <div key={event.id} style={{ border: "1px solid rgba(255,255,255,.2)", padding: 12, borderRadius: 12 }}>
            <strong>{event.event_type}</strong>
            <p>{event.reason || "No reason listed"}</p>
            <small>
              {event.pathname} · {event.country || "Unknown"} · Risk {event.risk_score}
            </small>
          </div>
        ))}
      </div>
    </main>
  );
}
