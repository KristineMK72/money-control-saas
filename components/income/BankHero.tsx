import Link from "next/link";

const INCOME_BG = "/7EBFF32F-5F7B-43FE-A55C-3E277E603F4B.png";

export default function BankHero() {
  return (
    <section className="bank-hero">
      <div className="bank-hero-frame">
        <img src={INCOME_BG} alt="Franklin's Bank" className="bank-hero-img" />

        <div className="bank-hero-shade" />

        <Link href="/world" className="bank-back-btn">
          ← Back to Town
        </Link>

        <div className="bank-hero-title">
          <p className="bank-eyebrow">Franklin&apos;s Bank</p>
          <h1>Income Ledger</h1>
          <p>
            Record earnings, scan proof, and let Ben turn every dollar into
            progress for the treasury.
          </p>
        </div>
      </div>
    </section>
  );
}
