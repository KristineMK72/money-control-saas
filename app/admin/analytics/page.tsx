import { redirect } from "next/navigation";
import Link from "next/link";
import {
  requireAdmin,
  getOverviewStats,
  getFunnelSteps,
  getFeatureAdoption,
  getLocations,
  getRetention,
  getSecurityEvents,
} from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pct(n: number | null) {
  if (n === null || Number.isNaN(n)) return "\u2014";
  return `${Math.round(n * 100)}%`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        borderRadius: 16,
        padding: "16px 18px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#94a3b8",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc" }}>
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{sub}</div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "rgba(15, 23, 42, 0.7)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <h2
        style={{
          margin: "0 0 14px",
          fontSize: 16,
          fontWeight: 800,
          color: "#e2e8f0",
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div
      style={{
        height: 8,
        background: "rgba(51, 65, 85, 0.8)",
        borderRadius: 99,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          background: "linear-gradient(90deg, #34d399, #10b981)",
          borderRadius: 99,
        }}
      />
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const { user, isAdmin } = await requireAdmin();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/dashboard");

  const [overview, funnel, features, locations, retention, security] =
    await Promise.all([
      getOverviewStats(),
      getFunnelSteps(),
      getFeatureAdoption(),
      getLocations(),
      getRetention(),
      getSecurityEvents(40),
    ]);

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const maxFeature = Math.max(1, ...features.map((f) => f.pageViews));
  const maxLoc = Math.max(1, ...locations.slice(0, 15).map((l) => l.visits));

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #020617 0%, #0f172a 50%, #052e1a 100%)",
        color: "#e2e8f0",
        padding: "24px 16px 48px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#34d399",
              }}
            >
              AskBen \u00b7 Admin
            </p>
            <h1
              style={{
                margin: "4px 0 0",
                fontSize: 28,
                fontWeight: 900,
                color: "#f8fafc",
              }}
            >
              Usage &amp; Location Dashboard
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#94a3b8" }}>
              Live metrics from visitors, product events, and security signals.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/admin/security"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                color: "#cbd5e1",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Security
            </Link>
            <Link
              href="/dashboard"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(52,211,153,0.4)",
                color: "#6ee7b7",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              \u2190 App
            </Link>
          </div>
        </div>

        <Section title="1 \u00b7 Overview (DAU / WAU / MAU)">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard label="DAU" value={overview.dau} sub="Unique IPs today" />
            <StatCard label="WAU" value={overview.wau} sub="Last 7 days" />
            <StatCard label="MAU" value={overview.mau} sub="Last 30 days" />
            <StatCard
              label="Sessions (all)"
              value={overview.totalSessions}
              sub="Non-bot page hits"
            />
            <StatCard
              label="Signed-up users"
              value={overview.signedUpUsers}
              sub={`+${overview.newUsers7d} in 7d`}
            />
            <StatCard
              label="Returning (7d)"
              value={overview.returningSessions7d}
              sub="IPs active on 2+ days"
            />
          </div>
        </Section>

        <Section title="2 \u00b7 Usage funnel">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {funnel.map((step) => (
              <div
                key={step.step}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 56px",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  {step.step}
                </span>
                <Bar value={step.count} max={maxFunnel} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    textAlign: "right",
                  }}
                >
                  {step.count}
                </span>
              </div>
            ))}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#64748b" }}>
            Page hits from visitors table. Named events need trackEvent() on key actions.
          </p>
        </Section>

        <Section title="3 \u00b7 Feature adoption">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                  <th style={{ padding: "8px 6px" }}>Feature</th>
                  <th style={{ padding: "8px 6px" }}>Path</th>
                  <th style={{ padding: "8px 6px" }}>Views</th>
                  <th style={{ padding: "8px 6px" }}>Unique</th>
                  <th style={{ padding: "8px 6px", minWidth: 120 }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.feature} style={{ borderTop: "1px solid rgba(51,65,85,0.6)" }}>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{f.feature}</td>
                    <td style={{ padding: "10px 6px", color: "#94a3b8" }}>{f.pathPrefix}</td>
                    <td style={{ padding: "10px 6px" }}>{f.pageViews}</td>
                    <td style={{ padding: "10px 6px" }}>{f.uniqueUsers}</td>
                    <td style={{ padding: "10px 6px" }}>
                      <Bar value={f.pageViews} max={maxFeature} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="4 \u00b7 Location (country / city)">
          {locations.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>
              No geo data yet. Vercel provides country/region/city headers in production.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>Country</th>
                    <th style={{ padding: "8px 6px" }}>Region</th>
                    <th style={{ padding: "8px 6px" }}>City</th>
                    <th style={{ padding: "8px 6px" }}>Visits</th>
                    <th style={{ padding: "8px 6px", minWidth: 100 }}> </th>
                  </tr>
                </thead>
                <tbody>
                  {locations.slice(0, 25).map((loc, i) => (
                    <tr key={`${loc.country}-${loc.city}-${i}`} style={{ borderTop: "1px solid rgba(51,65,85,0.6)" }}>
                      <td style={{ padding: "10px 6px", fontWeight: 600 }}>{loc.country || "\u2014"}</td>
                      <td style={{ padding: "10px 6px", color: "#94a3b8" }}>{loc.region || "\u2014"}</td>
                      <td style={{ padding: "10px 6px" }}>{loc.city || "\u2014"}</td>
                      <td style={{ padding: "10px 6px" }}>{loc.visits}</td>
                      <td style={{ padding: "10px 6px" }}>
                        <Bar value={loc.visits} max={maxLoc} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#64748b" }}>
            Coarse location only. IPs are hashed; no precise addresses stored.
          </p>
        </Section>

        <Section title="5 \u00b7 Retention">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard label="Day-1 return" value={pct(retention.day1Rate)} sub="Cohort with observable day 1" />
            <StatCard label="Day-7 return" value={pct(retention.day7Rate)} sub="Cohort with observable day 7" />
            <StatCard label="Any return" value={retention.usersWithReturn} sub={`of ${retention.cohortSize} cohort users`} />
          </div>
        </Section>

        <Section title="6 \u00b7 Security signals">
          {security.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>No security events recorded yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>When</th>
                    <th style={{ padding: "8px 6px" }}>Type</th>
                    <th style={{ padding: "8px 6px" }}>Path</th>
                    <th style={{ padding: "8px 6px" }}>Country</th>
                    <th style={{ padding: "8px 6px" }}>Score</th>
                    <th style={{ padding: "8px 6px" }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {security.map((ev) => (
                    <tr key={ev.id} style={{ borderTop: "1px solid rgba(51,65,85,0.6)" }}>
                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap", color: "#94a3b8" }}>
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: "8px 6px", fontWeight: 600 }}>{ev.event_type}</td>
                      <td style={{ padding: "8px 6px" }}>{ev.pathname || "\u2014"}</td>
                      <td style={{ padding: "8px 6px" }}>{ev.country || "\u2014"}</td>
                      <td style={{ padding: "8px 6px" }}>{ev.risk_score ?? "\u2014"}</td>
                      <td style={{ padding: "8px 6px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ev.reason || "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 8 }}>
          Admin only \u00b7 askben.buzz \u00b7 Data from Supabase visitors + product_events
        </p>
      </div>
    </main>
  );
}
