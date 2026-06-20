export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl border border-amber-300/30 bg-black/80 p-8 text-white shadow-2xl backdrop-blur-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/ben-governor.png"
            alt="Benjamin Franklin"
            className="mb-4 h-40 w-auto"
          />

          <h1 className="font-serif text-5xl font-bold text-amber-200">
            Terms of Service
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-stone-200">
            Welcome to AskBen. By using this platform, you agree to these terms
            and conditions. Our goal is to provide helpful financial
            organization tools while maintaining a safe and trustworthy
            experience for all users.
          </p>

          <p className="mt-3 text-sm text-stone-400">
            Last Updated: May 21, 2026
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Informational Use Only
          </h2>
          <p className="text-stone-200">
            AskBen provides budgeting, financial organization, educational, and
            informational tools. AskBen is not a bank, lender, brokerage,
            attorney, accountant, or licensed financial advisor. Information
            provided through the platform should not be considered professional
            financial advice.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            User Responsibility
          </h2>
          <p className="text-stone-200">
            Users remain responsible for their own financial decisions, account
            activity, and personal record keeping. You are responsible for
            maintaining the confidentiality of your login credentials and for
            all activity occurring under your account.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Subscriptions & Payments
          </h2>
          <p className="text-stone-200">
            Certain AskBen features may require a paid subscription. Payments
            are securely processed through Stripe. Subscription pricing,
            features, and availability may change over time as the platform
            evolves.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Prohibited Use
          </h2>
          <ul className="space-y-3 text-stone-200">
            <li>🚫 Unauthorized access attempts</li>
            <li>🚫 Malicious software, scripts, or attacks</li>
            <li>🚫 Fraudulent activity or misrepresentation</li>
            <li>🚫 Attempts to disrupt platform operations</li>
            <li>🚫 Abuse of system resources or security controls</li>
          </ul>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Availability & Improvements
          </h2>
          <p className="text-stone-200">
            AskBen is an evolving platform. Features, designs, rewards,
            gamification systems, integrations, and services may be added,
            modified, improved, or retired as the platform continues to grow.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Contact Us
          </h2>
          <p className="text-stone-200">
            Questions regarding these Terms of Service may be directed to:
          </p>
          <p className="mt-4 text-lg font-semibold text-amber-200">
            support@askben.buzz
          </p>
        </section>

        <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-100/95 px-6 py-4 text-center text-stone-900">
          <p className="font-serif italic">
            “Well done is better than well said.”
          </p>
          <p className="mt-1 text-sm">— Benjamin Franklin</p>
        </div>
      </div>
    </main>
  );
}
