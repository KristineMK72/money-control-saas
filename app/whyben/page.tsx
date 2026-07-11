import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Why AskBen?",
  description:
    "AskBen helps people rebuild financial confidence through guidance, progress, and positive reinforcement.",
  openGraph: {
    title: "Why AskBen?",
    description: "Financial wellness built around people, not spreadsheets.",
    images: ["/ben-thinking.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why AskBen?",
    description: "Financial wellness built around people, not spreadsheets.",
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
    note: "Household financial pressure, bill stress, and financial well-being research.",
  },
  {
    name: "Federal Reserve — Economic Well-Being of U.S. Households in 2024",
    href: "https://www.federalreserve.gov/publications/2025-economic-well-being-of-us-households-in-2024-overall-financial-well-being.htm",
    note: "Research on inflation, emergency savings, household stress, and financial resilience.",
  },
  {
    name: "CFPB — Financial Well-Being Scale",
    href: "https://www.consumerfinance.gov/consumer-tools/educator-tools/financial-well-being-resources/measure-and-score/",
    note: "A framework for confidence, control, resilience, and financial choice.",
  },
  {
    name: "National Library of Medicine — Financial Stress and Mental Health Research",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8806009/",
    note: "Research connecting financial stress with emotional strain and mental health.",
  },
  {
    name: "Simply Psychology — Positive Reinforcement",
    href: "https://www.simplypsychology.org/operant-conditioning.html",
    note: "Explains how positive reinforcement can encourage repeated behavior.",
  },
];

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/90 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
      {children}
    </section>
  );
}

function BenImage({
  src,
  size = "normal",
}: {
  src: string;
  size?: "normal" | "large";
}) {
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
                Rebuilding the Treasury.
                <br />
                Rebuilding confidence.
              </h1>

              <div className="mt-5 space-y-4 text-lg font-bold leading-8 text-zinc-700">
                <p>Money problems rarely start with money.</p>
                <p>
                  They start with stress, avoidance, shame, overwhelm, and the
                  feeling that you are already too far behind.
                </p>
                <p>
                  Most financial apps were built to track numbers. AskBen was
                  built to help people move forward.
                </p>
                <p className="text-2xl font-black text-emerald-800">
                  One decision. One payment. One victory. One rebuilt Treasury
                  at a time.
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
          eyebrow="Why AskBen exists"
          title="Financial stress is not just a math problem."
        >
          <p>
            Behind every overdue bill, debt balance, budget category, and
            financial goal is a real person trying to breathe again.
          </p>
          <p>
            People are not always stuck because they do not know what to do.
            Often, they are stuck because the process feels painful,
            intimidating, or hopeless.
          </p>
          <p>
            AskBen helps turn financial management from something people avoid
            into something they can face one step at a time.
          </p>
        </BenSection>

        <BenSection
          image="/ben-facepalm.png"
          title="Most apps show the problem. AskBen helps with the next step."
          reverse
        >
          <p>
            Traditional finance apps often lead with red warnings, large debt
            totals, negative balances, and complicated charts.
          </p>
          <p>
            Those numbers may be true, but they do not always help someone feel
            capable of changing them.
          </p>
          <p>AskBen still tells the truth, but it does it with:</p>
          <BulletList
            items={[
              "Clear next steps",
              "Encouragement instead of shame",
              "Progress tracking",
              "Debt payoff guidance",
              "Bill awareness",
              "Small wins that build momentum",
            ]}
          />
        </BenSection>

        <BenSection image="/ben-thinking.png" title="The avoidance problem.">
          <p>
            Most people do not avoid their finances because they are
            irresponsible.
          </p>
          <p>They avoid them because the experience feels painful.</p>
          <p>Financial avoidance can look like:</p>
          <BulletList
            items={[
              "Not opening bills",
              "Ignoring balances",
              "Avoiding debt totals",
              "Putting off payments",
              "Feeling embarrassed to ask for help",
              "Waiting until things feel urgent",
            ]}
          />
          <p>
            AskBen was designed to make the first step feel smaller, safer, and
            more possible.
          </p>
        </BenSection>

        <BenSection
          image="/ben-mastermind.png"
          title="The missing piece is motivation."
          reverse
        >
          <p>
            People know they should budget. They know they should save. They
            know they should pay down debt.
          </p>
          <p>But knowledge alone does not create consistency.</p>
          <p>AskBen encourages healthy money habits with:</p>
          <BulletList
            items={[
              "Reputation points",
              "Achievements",
              "Ranks",
              "Streaks",
              "Weekly missions",
              "Debt campaign victories",
              "Ben’s reactions and encouragement",
              "Milestones that make progress visible",
            ]}
          />
          <p>
            The goal is not perfection. The goal is momentum.
          </p>
        </BenSection>

        <BenSection image="/ben-winning.png" title="Progress deserves to be celebrated.">
          <p>AskBen treats small financial actions like wins because they are.</p>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <p>Review a debt? Victory.</p>
            <p className="mt-2">Log a payment? Victory.</p>
            <p className="mt-2">Pay off a card? Major victory.</p>
            <p className="mt-2">Come back tomorrow? Momentum.</p>
          </div>
          <p>
            Every action becomes another brick in rebuilding the Treasury.
          </p>
        </BenSection>

        <BenSection
          image="/ben-recovery.png"
          title="Rebuilding the Treasury."
          reverse
        >
          <p>Traditional finance apps often focus on what is wrong.</p>
          <p>AskBen focuses on what is improving.</p>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
            <p>Instead of only saying: “You still owe $5,000.”</p>
            <p className="mt-2">
              AskBen highlights: “You paid off $500 this month.”
            </p>
          </div>

          <p>
            Rebuilding is not one giant leap. It is repeated proof that progress
            is still possible.
          </p>
        </BenSection>

        <BenSection image="/ben-thinking.png" title="Your finances belong to you.">
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
          <p>
            It is not about making money management childish. It is about making
            progress feel possible, visible, and worth coming back to.
          </p>
        </BenSection>

        <Panel>
          <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
            <BenImage src="/ben-winning.png" />

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
                Early User Feedback
              </p>

              <h2 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">
                “For the first time, I didn’t feel judged by my money app.”
              </h2>

              <div className="mt-4 space-y-4 text-base font-bold leading-8 text-zinc-700">
                <p>
                  “AskBen made it feel less scary to look at my bills and debt.
                  Instead of feeling like I failed, I could see what I already
                  did right and what one next step I could take.”
                </p>

                <p className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
                  — Early AskBen tester
                </p>
              </div>
            </div>
          </div>
        </Panel>

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

              <p>
                We believe financial wellness should feel less like punishment
                and more like rebuilding.
              </p>

              <p className="text-2xl font-black text-emerald-800">
                One payment. One decision. One victory.
                <br />
                One rebuilt Treasury at a time.
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
            well-being, financial stress, emergency resilience, behavioral
            motivation, positive reinforcement, and habit formation.
          </p>

          <div className="mt-5 grid gap-3">
            {sources.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:bg-emerald-50"
              >
                <p className="text-sm font-black text-emerald-800">
                  {source.name}
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-zinc-600">
                  {source.note}
                </p>
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
