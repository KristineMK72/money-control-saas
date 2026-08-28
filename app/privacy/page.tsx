export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl border border-amber-300/30 bg-black/80 p-8 text-white shadow-2xl backdrop-blur-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/ben-recovery.png"
            alt="Benjamin Franklin"
            className="mb-4 h-40 w-auto"
          />

          <h1 className="font-serif text-5xl font-bold text-amber-200">
            Privacy Policy
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-stone-200">
            Your financial journey belongs to you. AskBen is designed to help
            you organize, understand, and improve your finances while respecting
            your privacy and protecting your information.
          </p>

          <p className="mt-3 text-sm text-stone-400">
            Last Updated: August 28, 2026
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Information We Collect
          </h2>

          <p className="text-stone-200">
            AskBen may collect account information such as email addresses,
            authentication data, and financial information voluntarily entered
            by users. This may include bills, debts, income records, spending
            information, payment tracking, goals, and other information used to
            help organize your finances.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            How We Use It
          </h2>

          <p className="text-stone-200">
            We use what you enter to rank bills, show a next action, keep your
            ledger, process subscriptions, and improve the product. When you Ask
            Ben, relevant ledger details you have already entered may be sent to
            our AI provider so Ben can answer in context. We do not use your
            ledger to train public advertising models, and we do not sell it.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            How We Protect Your Data
          </h2>

          <p className="text-stone-200">
            AskBen uses encrypted HTTPS connections, authenticated user accounts,
            and database-level access protections to help safeguard your
            information. User records are designed to be accessible only by the
            account owner.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            What We Do Not Do
          </h2>

          <ul className="space-y-3 text-stone-200">
            <li>✅ We do not sell your financial data.</li>
            <li>
              ✅ We do not publicly share your personal financial information.
            </li>
            <li>
              ✅ We do not require bank account connections to use core features.
            </li>
            <li>✅ We do not share your data with advertisers.</li>
            <li>✅ We do not publish your financial information.</li>
            <li>✅ We do not ask for a Social Security number or bank password.</li>
          </ul>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Third-Party Services
          </h2>

          <p className="text-stone-200">
            AskBen uses trusted providers including Supabase (accounts and data),
            Stripe (subscriptions), Vercel (hosting), and OpenAI (Ask Ben
            replies). Those providers process only what is needed to run the
            feature you used.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Your Control
          </h2>

          <p className="text-stone-200">
            You remain in control of the information you choose to enter into
            AskBen. You may update or remove information within your account as
            features allow. Email support@askben.buzz to request account or data
            deletion. We encourage users not to store highly sensitive personal
            information such as Social Security numbers, banking credentials, or
            account passwords within the platform.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-300/20 bg-black/40 p-6">
          <h2 className="mb-4 font-serif text-2xl text-amber-200">
            Contact Us
          </h2>

          <p className="text-stone-200">
            Questions regarding this Privacy Policy may be directed to:
          </p>

          <p className="mt-4 text-lg font-semibold text-amber-200">
            support@askben.buzz
          </p>
        </section>

        <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-100/95 px-6 py-4 text-center text-stone-900">
          <p className="font-serif italic">
            “Beware of little expenses. A small leak will sink a great ship.”
          </p>
          <p className="mt-1 text-sm">— Benjamin Franklin</p>
        </div>
      </div>
    </main>
  );
}
