import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Why AskBen?",
  description:
    "AskBen helps people rebuild financial confidence through guidance, progress, and positive reinforcement.",
  openGraph: {
    title: "Why AskBen?",
    description:
      "Financial wellness built around people, not spreadsheets.",
    images: ["/ben-thinking.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why AskBen?",
    description:
      "Financial wellness built around people, not spreadsheets.",
    images: ["/ben-thinking.png"],
  },
};

type BenSectionProps = {
  image: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  reverse?: boolean;
};

const sources = [
  {
    name: "Consumer Financial Protection Bureau — Making Ends Meet in 2024",
    href: "https://www.consumerfinance.gov/data-research/research-reports/making-ends-meet-in-2024-insights-from-the-making-ends-meet-survey/",
  },
  {
    name: "Federal Reserve — Economic Well-Being of U.S. Households in 2024",
    href: "https://www.federalreserve.gov/publications/2025-economic-well-being-of-us-households-in-2024-overall-financial-well-being.htm",
  },
  {
    name: "National Library of Medicine — Financial Stress and Mental Health Research",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8806009/",
  },
  {
    name: "Simply Psychology — Positive Reinforcement",
    href: "https://www.simplypsychology.org/operant-conditioning.html",
  },
];

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/90 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
      {children}
    </section>
  );
}

function BenImage({ src, size = "normal" }: { src: string; size?: "normal" | "large" }) {
  return (
    <img
      src={src}
      alt="AskBen mood"
      className={`mx-auto rounded-[2rem] border border-amber-200 bg-white object-contain p-4 shadow-xl ${
        size === "large" ? "h-56 w-56" : "h-40 w-40"
      }`}
    />
  );
}

function BenSection({
  image,
  eyebrow,
  title,
  children,
  reverse = false,
}: BenSectionProps) {
  return (
    <Panel>
      <div
        className={`grid gap-6 md:items-center ${
          reverse ? "md:grid-cols-[1fr_180px]" : "md:grid-cols-[180px_1fr]"
        }`}
      >
        {!reverse && <BenImage src={image} />}

        <div>
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              {eyebrow}
            </p>
          ) : null}

          <h2 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">
            {title}
          </h2>

          <div className="mt-4 space-y-4 text-base font-bold leading-8 text-zinc-700">
            {children}
          </div>
        </div>

        {reverse && <BenImage src={image} />}
      </div>
    </Panel>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <ul className="space-y-2 font-bold text-emerald-950">
        {items.map((item) => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function WhyBenPage() {
  return (
    <main className="min-h-screen bg-[#080706] px-4 py-6 md:px-6">
      <div className="mx-auto grid max-w-5xl gap-6">
        <Panel>
          <div className="grid gap-8 md:grid-cols-[1fr_240px] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">
                The AskBen Mission
              </p>

              <h1 className="mt-3 text-5xl font-black leading-none text-zinc-950 md:text-6xl">
                Rebuilding the Treasury, one decision at a time.
              </h1>

              <div className="mt-5 space-y-4 text-lg font-bold leading-8 text-zinc-700">
                <p>Many financial apps focus on numbers.</p>
                <p>AskBen focuses on people.</p>
                <p>
                  Behind every debt balance, overdue bill, budget category, and
                  financial goal is a real person trying to breathe again.
                </p>
                <p>
                  AskBen was built on one belief: financial management should
                  feel empowering, not intimidating.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg"
                >
                  Start rebuilding the Treasury
                </Link>

                <Link
                  href="/login"
                  className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-900 shadow-sm"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="text-center">
              <BenImage src="/ben-thinking.png" size="large" />

              <p className="mt-4 text-sm font-black italic leading-6 text-zinc-600">
                “An investment in knowledge pays the best interest.”
              </p>
            </div>
          </div>
        </Panel>

        <BenSection
          image="/ben-overdraft.png"
          eyebrow="Why AskBen matters now"
          title="Financial stress is increasing."
        >
          <p>
            Housing, food, utilities, transportation, healthcare, childcare,
            insurance, and everyday necessities keep putting pressure on
            household budgets.
          </p>
          <p>
            Many people are not looking for luxury. They are looking for
            breathing room.
          </p>
          <p>
            AskBen helps people face their finances without shame, panic, or
            spreadsheet overwhelm.
          </p>
        </BenSection>

        <BenSection
          image="/ben-facepalm.png"
          title="Financial stress is more than a money problem."
          reverse
        >
          <p>Financial stress can affect sleep, focus, confidence, and mood.</p>
          <p>It can lead to:</p>
          <BulletList
            items={[
              "Avoiding bills",
              "Ignoring balances",
              "Feeling overwhelmed",
              "Putting off financial decisions",
              "Feeling stuck before even starting",
            ]}
          />
          <p>AskBen exists to help break that cycle.</p>
        </BenSection>

        <BenSection image="/ben-thinking.png" title="The avoidance problem.">
          <p>
            Most people do not avoid their finances because they are
            irresponsible. They avoid them because the experience feels painful.
          </p>
          <p>Traditional finance apps often show:</p>
          <BulletList
            items={[
              "Large debt totals",
              "Negative balances",
              "Red warnings",
              "Complicated charts",
              "Endless categories",
            ]}
          />
          <p>
            AskBen still tells the truth, but it does it with guidance,
            encouragement, and a clear next step.
          </p>
        </BenSection>

        <BenSection
          image="/ben-mastermind.png"
          title="The missing piece is motivation."
          reverse
        >
          <p>
            People stay engaged when progress is visible and effort is
            recognized.
          </p>
          <p>AskBen encourages healthy money habits with:</p>
          <BulletList
            items={[
              "Reputation points",
              "Achievements",
              "Ranks",
              "Streaks",
              "Debt campaign victories",
              "Milestones",
              "Ben’s reactions and encouragement",
            ]}
          />
          <p>
            The goal is not to turn money into a game. The goal is to make
            progress feel possible.
          </p>
        </BenSection>

        <BenSection
          image="/ben-thinking.png"
          title="Your finances belong to you."
        >
          <p>
            AskBen was designed so users stay in control of what they share.
          </p>

          <CheckList
            items={[
              "No Social Security numbers required",
              "No bank passwords required",
              "No account credentials required",
              "No mandatory bank linking",
              "No pressure to connect financial institutions",
              "OCR imports available without linking accounts",
              "Users choose what information they enter",
            ]}
          />

          <p>
            AskBen gives visibility and guidance without demanding access to
            your most sensitive financial information.
          </p>
        </BenSection>

        <BenSection
          image="/ben-winning.png"
          title="Finance should not feel like punishment."
          reverse
        >
          <p>Budgeting should not feel like detention.</p>
          <p>
            AskBen turns financial management into a journey with progress,
            rewards, campaigns, encouragement, and small wins that add up.
          </p>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-black text-emerald-950">
              The goal is momentum, not perfection.
            </p>
            <p className="mt-2 font-bold text-emerald-900">
              One payment, one bill, one reviewed debt, and one better decision
              at a time.
            </p>
          </div>
        </BenSection>

        <BenSection image="/ben-recovery.png" title="Rebuilding the Treasury.">
          <p>Traditional finance apps often focus on what is wrong.</p>
          <p>AskBen focuses on what is improving.</p>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
            <p>Instead of only saying: “You still owe $5,000.”</p>
            <p className="mt-2">
              AskBen highlights: “You paid off $500 this month.”
            </p>
          </div>

          <p>
            Every payment recorded, bill planned, debt reviewed, and dollar
            tracked becomes another brick in rebuilding the Treasury.
          </p>
        </BenSection>

        <BenSection
          image="/ben-goal-achieved.png"
          title="The future of financial wellness."
          reverse
        >
          <p>Personal finance is not only a math problem.</p>
          <p>It is a behavioral challenge.</p>
          <p>
            AskBen combines financial tools, AI guidance, automation,
            behavioral science, and gamification to help people stay engaged
            long enough to change their financial lives.
          </p>
        </BenSection>

        <Panel>
          <div className="text-center">
            <BenImage src="/ben-thinking.png" />

            <h2 className="mt-5 text-4xl font-black text-zinc-950">
              Our Mission
            </h2>

            <div className="mx-auto mt-4 max-w-3xl space-y-4 text-lg font-bold leading-8 text-zinc-700">
              <p>
                AskBen exists to reduce financial stress, eliminate avoidance,
                encourage healthy financial habits, and help people feel more
                confident about their future.
              </p>

              <p className="text-2xl font-black text-emerald-800">
                One payment. One decision. One victory. One rebuilt Treasury at
                a time.
              </p>
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-3xl font-black text-zinc-950">
            Research & Sources
          </h2>

          <p className="mt-3 text-sm font-bold leading-6 text-zinc-600">
            This page is informed by public research on household financial
            well-being, financial stress, mental health, positive reinforcement,
            and habit formation.
          </p>

          <div className="mt-5 grid gap-3">
            {sources.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
              >
                {source.name}
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
