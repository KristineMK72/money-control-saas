import Image from "next/image";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";
import SubscriptionOptions from "@/components/SubscriptionOptions";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl rounded-2xl border border-white/40 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
              Financial Triage
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              Stop financial chaos.
              <span className="block text-cyan-300">
                See exactly what to pay first.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold text-white/90">
              Upload bills, track spending, and get a calm, clear action plan
              for what matters most today.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
              >
                Preview App
              </a>

              <a
                href="/signup"
                className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
              >
                Start Free
              </a>

              <a
                href="/login"
                className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
              >
                Login
              </a>
            </div>

            <p className="mt-4 text-sm font-semibold text-white/80">
              Free trial feel. Upgrade later when you want smarter planning
              tools.
            </p>

            <SubscriptionOptions compact className="mt-6" />
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-white/40 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
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
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Meet Ben
                </div>

                <p className="mt-3 text-lg font-semibold leading-7 text-white">
                  &quot;America trusted me with the $100 bill.
                  <br />
                  I can probably help you with your electric bill too.&quot;
                </p>

                <p className="mt-3 text-sm text-white/75">
                  Ben is your built-in money guide for bill priorities, weekly
                  planning, and calmer next steps.
                </p>

                <a
                  href="/chat"
                  className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-100"
                >
                  Ask Ben
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Priority engine"
            text="See which bill matters most first based on due date and real-life risk."
          />
          <FeatureCard
            title="Spending clarity"
            text="Track spending and payments separately so your money picture stays honest."
          />
          <FeatureCard
            title="Screenshot import"
            text="Import transactions from screenshots instead of typing everything by hand."
          />
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
      <p className="mt-2 text-sm font-semibold leading-6 text-zinc-700">{text}</p>
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

      <p className="mt-4 text-sm font-semibold leading-6 text-zinc-700">{text}</p>

      <ul className="mt-6 space-y-2 text-sm font-semibold text-zinc-700">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={href}
          className={
            highlighted
              ? "inline-flex rounded-xl border border-zinc-200 bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-100"
              : "inline-flex rounded-xl border border-zinc-200 bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-100"
          }
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
