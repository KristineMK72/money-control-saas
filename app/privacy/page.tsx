export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "2rem",
        color: "white",
      }}
    >
      <h1>Privacy Policy</h1>

      <p>Last Updated: May 21, 2026</p>

      <h2>Information We Collect</h2>

      <p>
        AskBen may collect account information such as email addresses,
        authentication data, and financial information voluntarily entered
        by users including bills, debts, income, and spending information.
      </p>

      <h2>How We Protect Data</h2>

      <p>
        AskBen uses encrypted HTTPS connections, authenticated user accounts,
        and database-level access protections through Supabase.
      </p>

      <h2>What We Do Not Do</h2>

      <ul>
        <li>We do not sell your financial data.</li>
        <li>We do not publicly share your personal financial information.</li>
        <li>We do not require bank account connections to use core features.</li>
      </ul>

      <h2>Third-Party Services</h2>

      <p>
        AskBen uses trusted providers including Supabase, Stripe, and Vercel
        for infrastructure, authentication, and payments.
      </p>

      <h2>Contact</h2>

      <p>support@askben.buzz</p>
    </main>
  );
}
