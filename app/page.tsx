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
              Money clarity, with a little Franklin wit
            </div>

            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-7xl">
              Make your money clearer.
              <span className="block text-cyan-300">Even when it&apos;s doing just fine.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/90 drop-shadow-xl sm:text-xl">
              Whether you&apos;re untangling overdue bills, sharpening a comfortable
              plan, or chasing a new goal, AskBen turns your money into a clear
              next move—without the lecture or the powdered wig.
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
              Start with the free ledger. Add one bill, ask Ben what to do this
              week, then upgrade when you want deeper forecasting, imports, and
              planning tools.
            </p>
          </div>

          <div id="product-preview" className="scroll-mt-28">
            <ProductMock />
          </div>
        </div>

        <div id="how-it-works" className="mt-16 grid scroll-mt-28 gap-4 md:grid-cols-3">
          <FeatureCard
            step="1"
            title="Add one bill"
            text="Name, amount, due date. Two minutes. The ledger is the product — Ben needs something to rank."
          />
          <FeatureCard
            step="2"
            title="Ask Ben"
            text="He uses what you entered, names the next useful move, and stops there. No lecture. One action."
          />
          <FeatureCard
            step="3"
            title="Earn the town"
            text="Franklin’s Landing is the reward loop. Visit after the ledger is useful, not before."
          />
        </div>

        <div className="mt-16 rounded-3xl border border-white/20 bg-black/55 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
            Why AskBen?
          </p>

          <h2 className="mt-3 text-4xl font-black">
            Your money doesn&apos;t have to be on fire
            <span className="block text-cyan-300">
              to deserve a better plan.
            </span>
          </h2>

          <p className="mt-4 max-w-4xl text-lg font-semibold leading-8 text-white/80">
            AskBen is for the overdue, the on-track, the goal-chasers, and the
            pleasantly curious. Some days you need help protecting the lights;
            other days you want to know whether the vacation fund can meet the
            emergency fund without causing a diplomatic incident.
          </p>

          <p className="mt-4 max-w-4xl text-lg font-semibold leading-8 text-white/80">
            Wherever you begin, Ben helps you see the whole picture, choose a
            useful next step, and turn steady progress into something worth
            celebrating.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <MiniCard
              title="What AskBen Helps You Do"
              items={[
                "Know what needs attention first",
                "Plan goals while keeping everyday money organized",
                "Track bills, spending, debt, income, and savings",
                "Earn achievements and celebrate milestones",
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
                Or one already-solid Treasury made even sharper.
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

        <div id="pricing" className="mt-16 grid scroll-mt-28 gap-6 lg:grid-cols-3">
          <PricingCard
            eyebrow="Free ledger"
            price="$0"
            suffix=""
            text="Add bills, pick Ben’s voice, and get one next action. The town can wait."
            href="/signup"
            cta="Start free"
            items={[
              "Bills, debts, and payments you type",
              "Ask Ben for one next move",
              "No bank login required",
              "Upgrade only if you want more",
            ]}
            free
          />

          <PricingCard
            eyebrow="Pro Monthly"
            price="$5"
            suffix="/month"
            text="A flexible monthly option for smarter priorities, screenshot imports, goal tracking, and a calmer weekly plan."
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
            text="Best value for year-round planning, goal tracking, smarter prioritization, and a lower effective monthly price."
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

        <p className="mt-8 text-center text-sm font-semibold leading-6 text-white/65">
          AskBen is a planning tool, not a bank or a licensed advisor. Ben’s
          answers are informational. You decide what to pay.{" "}
          <a href="/privacy" className="text-cyan-200 underline-offset-2 hover:underline">
            Privacy
          </a>
          {" · "}
          <a href="/terms" className="text-cyan-200 underline-offset-2 hover:underline">
            Terms
          </a>
          {" · "}
          <a href="/security" className="text-cyan-200 underline-offset-2 hover:underline">
            Security
          </a>
        </p>
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
            Live Money Preview
          </div>
          <p className="mt-1 text-sm font-bold text-white/75">
            The kind of answer Ben gives when your ledger has real data.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <MockPanel
          eyebrow="This Week"
          title="Essentials"
          value="$460"
          detail="Covered, scheduled, and no longer taking up space in your head."
          tone="warning"
        />

        <MockPanel
          eyebrow="Next Milestone"
          title="Emergency fund"
          value="74%"
          detail="On track. One more steady month puts the next milestone within reach."
          tone="success"
        />

        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
            Ben&apos;s Advice
          </div>
          <p className="mt-2 text-lg font-black leading-7 text-white">
            Your essentials are covered. Put this week&apos;s extra toward the
            emergency fund, then enjoy the rest without interrogating every coffee.
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
            AskBen uses due dates, goals, payments already made, income, and
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
  tone: "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-300/25 bg-red-400/10 text-red-100"
      : tone === "success"
        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
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

function FeatureCard({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/95 p-5 text-zinc-950 shadow-xl shadow-zinc-950/10 backdrop-blur-xl">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
        Step {step}
      </div>
      <h2 className="mt-2 text-lg font-black text-zinc-950">{title}</h2>
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
  free = false,
}: {
  eyebrow: string;
  price: string;
  suffix: string;
  text: string;
  href: string;
  cta: string;
  items: string[];
  highlighted?: boolean;
  free?: boolean;
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
          className={
            free || highlighted
              ? "inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
              : "inline-flex rounded-xl border border-zinc-200 bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-100"
          }
        >
          {free ? cta : "Create account"}
        </a>

        {!free && (
          <StripeCheckoutButton
            plan={href.includes("yearly") ? "yearly" : "monthly"}
            className={
              highlighted
                ? "inline-flex rounded-xl bg-zinc-950 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                : "inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
            }
          >
            {cta}
          </StripeCheckoutButton>
        )}
      </div>
    </div>
  );
}
