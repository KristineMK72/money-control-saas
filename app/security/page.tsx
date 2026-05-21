export default function SecurityPage() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "2rem",
        color: "white",
      }}
    >
      <h1>Security Overview</h1>

      <p>Last Updated: May 21, 2026</p>

      <h2>Security Features</h2>

      <ul>
        <li>Encrypted HTTPS connections</li>
        <li>Authenticated user accounts</li>
        <li>User-specific database protections</li>
        <li>Secure cloud infrastructure</li>
        <li>Payments processed through Stripe</li>
      </ul>

      <h2>Infrastructure Providers</h2>

      <p>
        AskBen is powered by trusted providers including Supabase,
        Stripe, and Vercel.
      </p>

      <h2>Data Protection</h2>

      <p>
        AskBen uses database-level access controls designed to restrict
        users to their own account information.
      </p>

      <h2>Responsible Disclosure</h2>

      <p>
        If you believe you found a security issue, contact:
      </p>

      <p>security@askben.buzz</p>
    </main>
  );
}
