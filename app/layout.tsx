import Image from "next/image";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";
import SubscriptionOptions from "@/components/SubscriptionOptions";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl rounded-3xl border border-white/30 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-1 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
              Welcome to Franklin&apos;s Landing
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              Rebuild your treasury.
              <span className="block text-cyan-300">
                One bill, one win, one level at a time.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/90">
              AskBen turns financial chaos into a clear game plan. Track bills,
              tame debt, earn victories, and let Benjamin Franklin help you
              decide what to do next.
            </p>

            <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold leading-7 text-cyan-50">
              No shame. No confusing spreadsheets. Just calm money triage,
              witty colonial encouragement, and a path back to control.
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90"
              >
                Preview App
              </a>

              <a
                href="/signup"
                className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15"
              >
                Start Free
              </a>

              <a
                href="/login"
                className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 font-black text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Login
              </a>

              <a
                href="/world"
                className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-3 font-black text-yellow-100 transition hover:bg-yellow-300/15"
              >
                Enter Franklin&apos;s Landing
              </a>
            </div>

            <p className="mt-4 text-sm font-semibold text-white/75">
              Start free. Upgrade later when you want smarter planning tools.
            </p>

            <SubscriptionOptions compact className="mt-6" />
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-white/30 bg-slate-950/75 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900">
                <Image
                  src="/ben.png"
                  alt="Ben, your AI financial guide"
                  width={1200}
                  height={1200}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>

              <div className="mt-5">
                <div className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">
                  Meet Ben
                </div>

                <p className="mt-3 text-lg font-black leading-7 text-white">
                  &quot;America trusted me with the $100 bill.
                  <br />
                  I can probably help you with your electric bill too.&quot;
                </p>

                <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
                  Ben helps you figure out what is urgent, what can wait, and
                  how to rebuild your treasury without feeling buried alive by
                  numbers.
                </p>

                <a
                  href="/chat"
                  className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-black text-black transition hover:bg-zinc-100"
                >
                  Ask Ben 💰
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
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

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
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
