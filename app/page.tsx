import Image from "next/image";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";

export default function HomePage() {
  return (

    <main className="public-landing-page min-h-screen bg-transparent text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.public-landing-page) nav[aria-label="AskBen navigation"],
            body:has(.public-landing-page) a[aria-label="Settings"],
            body:has(.public-landing-page) button[aria-label="Open menu"],
            body:has(.public-landing-page) div:has(> img[alt="AskBen mascot"]),
            body:has(.public-landing-page) details,
            body:has(.public-landing-page) a[aria-label="Ask Ben"] {
              display: none !important;
            }
          `,
        }}
      />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 lg:pt-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
            Franklin&apos;s Landing
          </div>

          <nav
            aria-label="Landing navigation"
            className="flex flex-wrap items-center gap-2 text-sm font-black"
          >
            <a
              href="#how-it-works"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-white/85 transition hover:bg-white/15"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-white/85 transition hover:bg-white/15"
            >
              Pricing
            </a>
            <a
              href="/login"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-white/85 transition hover:bg-white/15"
            >
              Login
            </a>
            <a
              href="/signup"
              className="rounded-full bg-cyan-300 px-4 py-2 text-zinc-950 transition hover:bg-cyan-200"
            >
              Start Free
            </a>
          </nav>
        </div>

        <div className="grid items-center gap-10 lg:min-h-[calc(100vh-210px)] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-yellow-300/35 bg-black/45 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200 shadow-xl backdrop-blur-xl">
              AskBen financial triage
            </div>

            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-7xl">
              Know what to pay first.
              <span className="block text-cyan-300">Then make the next move.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/90 drop-shadow-xl sm:text-xl">
              AskBen looks at your bills, debts, income, spending, and payments
              to turn money stress into a clear next step.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-xl bg-cyan-300 px-6 py-4 text-lg font-black text-zinc-950 shadow-2xl shadow-cyan-950/30 transition hover:bg-cyan-200"
              >
                Start Free
              </a>

              <a
                href="#product-preview"
                className="rounded-xl border border-white/25 bg-black/45 px-6 py-4 text-lg font-black text-white shadow-2xl backdrop-blur-xl transition hover:bg-white/10"
              >
                See Ben in Action
              </a>

            </div>

            <div className="mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
              <TrustPill text="No bank passwords required" />
              <TrustPill text="No Social Security number required" />
              <TrustPill text="You choose what to enter" />
              <TrustPill text="Payments handled by Stripe" />
            </div>

            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/75">
              Start with the free ledger. Upgrade later when you want deeper
              forecasting, imports, and crisis-mode planning.
            </p>
          </div>


          <div id="product-preview" className="scroll-mt-28">
            <ProductMock />
          </div>
        </div>

        <div id="how-it-works" className="mt-16 grid scroll-mt-28 gap-4 md:grid-cols-3">
          <FeatureCard
            title="Know what to pay first"
            text="Ben ranks bills, debts, and due dates so you can stop guessing and make the next smart move."
          />
          <FeatureCard
            title="Make money feel like a game"
            text="Earn XP, complete Governor’s Orders, unlock badges, and rebuild Franklin’s Landing one win at a time."
          />
          <FeatureCard
            title="Track without shame"
            text="Bills, spending, debt, payments, savings, and progress all live in one calmer place."
          />
        </div>

        <div className="mt-16 rounded-3xl border border-white/20 bg-black/55 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
            Why AskBen?
          </p>

          <h2 className="mt-3 text-4xl font-black">
            Money problems rarely start with money.
            <span className="block text-cyan-300">
              They start with stress.
            </span>
          </h2>

          <p className="mt-4 max-w-4xl text-lg font-semibold leading-8 text-white/80">
            Most financial apps focus on numbers. AskBen focuses on people.
            Behind every overdue bill, debt balance, budget category, and
            financial goal is a real person trying to breathe again.
          </p>

          <p className="mt-4 max-w-4xl text-lg font-semibold leading-8 text-white/80">
            AskBen helps turn financial chaos into a calmer plan with guidance,
            encouragement, progress tracking, and small wins that build
            momentum.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <MiniCard
              title="What AskBen Helps You Do"
              items={[
                "Know what needs attention first",
                "Track bills, spending, debt, income, and progress",
                "Earn achievements and celebrate milestones",
                "Build momentum one small win at a time",
              ]}
            />

            <MiniCard
              title="You Stay In Control"
              items={[
                "No Social Security numbers required",
                "No bank passwords required",
                "No mandatory bank account connections",
                "You choose what information to enter",
              ]}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <TestimonialCard
              quote="For the first time, I didn’t feel judged by my money app."
              text="AskBen made it feel less scary to look at bills and debt. Instead of feeling like I failed, I could see one next step."
              name="Early AskBen tester"
            />

            <TestimonialCard
              quote="It made money feel less overwhelming."
              text="The small wins, Ben’s encouragement, and the clear priorities made it easier to come back instead of avoiding everything."
              name="Early AskBen tester"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-5 text-center">
            <p className="text-lg font-black leading-8 text-yellow-100">
              One payment. One decision. One victory.
              <span className="block text-cyan-200">
                One rebuilt Treasury at a time.
              </span>
            </p>

            <a
              href="/whyben"
              className="mt-5 inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90"
            >
              Read the whole story
            </a>
          </div>
        </div>

        <div id="pricing" className="mt-16 grid scroll-mt-28 gap-6 lg:grid-cols-2">
          <PricingCard
            eyebrow="Pro Monthly"
            price="$5"
            suffix="/month"
            text="Perfect for users who want screenshot import, smarter prioritization, and a calm weekly money plan."
            href="/signup?plan=monthly"
            cta="Choose $5/month"
            items={[
              "Full dashboard + forecast",
              "Screenshot transaction import",
              "Crisis mode planning",
              "Shareable financial plan",
            ]}
          />

          <PricingCard
            highlighted
            eyebrow="Pro Yearly"
            price="$39"
            suffix="/year"
            text="Best value for users who want the full app all year and a lower effective monthly price."
            href="/signup?plan=yearly"
            cta="Choose $39/year"
            items={[
              "Everything in Monthly",
              "Lower yearly price",
              "Better long-term planning",
              "Ideal for serious users",
            ]}
          />
        </div>
      </section>
    </main>
  );
}

function TrustPill({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-cyan-300/20 bg-black/45 px-4 py-3 text-sm font-black text-cyan-50 shadow-xl backdrop-blur-xl">
      {text}
    </div>
  );
}

function ProductMock() {
  return (
    <div className="w-full rounded-3xl border border-white/25 bg-slate-950/82 p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Image
          src="/ben.png"
          alt="Ben, your AI financial guide"
          width={96}
          height={96}
          className="h-14 w-14 rounded-2xl border border-cyan-200/25 object-cover"
          priority
        />

        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
            Live Triage Preview
          </div>
          <p className="mt-1 text-sm font-bold text-white/75">
            The kind of answer Ben gives when your ledger has real data.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <MockPanel
          eyebrow="Due Soon"
          title="Electric bill"
          value="$148.20"
          detail="Due tomorrow. Protect utilities before optional spending."
          tone="danger"
        />

        <MockPanel
          eyebrow="Top Priority"
          title="Car payment"
          value="$312.00"
          detail="Keeps transportation stable. Ranked above extra debt payments."
          tone="warning"
        />

        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
            Ben&apos;s Advice
          </div>
          <p className="mt-2 text-lg font-black leading-7 text-white">
            Pay the electric bill first, then set aside the car payment. The
            credit card can wait until essentials are covered.
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
            AskBen uses due dates, minimums, payments already made, income, and
            spending patterns before giving advice.
          </p>
        </div>
      </div>
    </div>
  );
}

function MockPanel({
  eyebrow,
  title,
  value,
  detail,
  tone,
}: {
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  tone: "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-300/25 bg-red-400/10 text-red-100"
      : "border-yellow-300/25 bg-yellow-300/10 text-yellow-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] opacity-80">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        </div>
        <div className="shrink-0 rounded-xl bg-black/35 px-3 py-2 text-lg font-black text-white">
          {value}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
        {detail}
      </p>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/95 p-5 text-zinc-950 shadow-xl shadow-zinc-950/10 backdrop-blur-xl">
      <h2 className="text-lg font-black text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-zinc-700">
        {text}
      </p>
    </div>
  );
}

function MiniCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
      <h3 className="text-xl font-black text-yellow-200">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm font-bold text-white/80">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function TestimonialCard({
  quote,
  text,
  name,
}: {
  quote: string;
  text: string;
  name: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
      <p className="text-xl font-black leading-7 text-cyan-100">
        “{quote}”
      </p>

      <p className="mt-3 text-sm font-semibold leading-6 text-white/80">
        {text}
      </p>

      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/50">
        — {name}
      </p>
    </div>
  );
}

function PricingCard({
  eyebrow,
  price,
  suffix,
  text,
  href,
  cta,
  items,
  highlighted = false,
}: {
  eyebrow: string;
  price: string;
  suffix: string;
  text: string;
  href: string;
  cta: string;
  items: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "rounded-2xl border border-cyan-200 bg-white/95 p-8 text-zinc-950 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl"
          : "rounded-2xl border border-white/80 bg-white/95 p-8 text-zinc-950 shadow-xl shadow-zinc-950/10 backdrop-blur-xl"
      }
    >
      <div
        className={
          highlighted
            ? "text-sm font-black uppercase tracking-[0.2em] text-cyan-700"
            : "text-sm font-black uppercase tracking-[0.2em] text-zinc-500"
        }
      >
        {eyebrow}
      </div>

      <div className="mt-3 text-4xl font-black text-zinc-950">
        {price}
        <span className="text-lg text-zinc-500">{suffix}</span>
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-zinc-700">
        {text}
      </p>

      <ul className="mt-6 space-y-2 text-sm font-semibold text-zinc-700">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={href}
          className="inline-flex rounded-xl border border-zinc-200 bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-100"
        >
          Create account
        </a>

        <StripeCheckoutButton
          plan={href.includes("yearly") ? "yearly" : "monthly"}
          className={
            highlighted
              ? "inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-60"
              : "inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
          }
        >
          {cta}
        </StripeCheckoutButton>
      </div>
    </div>
  );
}
