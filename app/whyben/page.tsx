import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell, Panel } from "@/components/AppFrame";

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
    href: "https://pmc.ncbi.nlm.nih.gov/",
  },
  {
    name: "Behavioral Psychology — Positive Reinforcement and Habit Formation",
    href: "https://www.simplypsychology.org/operant-conditioning.html",
  },
];

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
        className={`grid gap-6 md:grid-cols-[180px_1fr] md:items-center ${
          reverse ? "md:grid-cols-[1fr_180px]" : ""
        }`}
      >
        {!reverse && (
          <img
            src={image}
            alt="AskBen mood"
            className="mx-auto h-40 w-40 rounded-[2rem] border border-amber-200 bg-white object-contain p-4 shadow-xl"
          />
        )}

        <div>
          {eyebrow && (
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              {eyebrow}
            </p>
          )}

          <h2 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">
            {title}
          </h2>

          <div className="mt-4 space-y-4 text-base font-bold leading-8 text-zinc-700">
            {children}
          </div>
        </div>

        {reverse && (
          <img
            src={image}
            alt="AskBen mood"
            className="mx-auto h-40 w-40 rounded-[2rem] border border-amber-200 bg-white object-contain p-4 shadow-xl"
          />
        )}
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

export default function WhyBenPage() {
  return (
    <AppShell max="max-w-5xl">
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
              <p>Many financial applications focus on numbers.</p>
              <p>AskBen focuses on people.</p>
              <p>
                Behind every debt balance, missed payment, overdue bill, or
                budget category is a person trying to navigate an increasingly
                complicated financial world.
              </p>
              <p>
                AskBen was built on a simple belief: financial management should
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
            <img
              src="/ben-head.png"
              alt="Benjamin Franklin"
              className="mx-auto h-56 w-56 rounded-[2rem] border border-amber-200 bg-white object-contain p-4 shadow-xl"
            />

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
          The financial environment facing consumers today is fundamentally
          different than it was just a few years ago.
        </p>

        <p>
          Housing, insurance, food, utilities, transportation, healthcare, and
          everyday necessities continue placing pressure on household budgets.
        </p>

        <p>
          The Consumer Financial Protection Bureau reported that overall
          financial stability and financial well-being deteriorated from 2023 to
          2024, with more households having difficulty paying bills and fewer
          households able to cover a month of expenses after losing income.
        </p>

        <p>
          The Federal Reserve also reported that 73% of adults were doing okay
          financially or living comfortably in 2024, below the 2021 high of 78%,
          and that inflation and prices remained the top financial concern.
        </p>

        <p>
          Many people are not looking for luxury. They are looking for breathing
          room.
        </p>
      </BenSection>

      <BenSection
        image="/ben-facepalm.png"
        title="Financial stress is more than a money problem."
        reverse
      >
        <p>Financial stress affects far more than a bank account.</p>

        <p>Research has linked financial stress to:</p>

        <BulletList
          items={[
            "Anxiety",
            "Emotional exhaustion",
            "Sleep disruption",
            "Reduced overall well-being",
            "Increased psychological distress",
          ]}
        />

        <p>
          Financial stress can create a cycle: stress creates anxiety, anxiety
          makes financial tasks harder, tasks get postponed, problems grow, and
          stress increases further.
        </p>

        <p>
          Many people eventually stop looking at their finances entirely. Not
          because they do not care — because the experience has become
          emotionally painful.
        </p>

        <p>AskBen exists to break that cycle.</p>
      </BenSection>

      <BenSection
        image="/ben-thinking.png"
        title="The avoidance problem."
      >
        <p>
          Most people do not avoid their finances because they are
          irresponsible. They avoid finances because the experience often feels
          overwhelming.
        </p>

        <p>Many people avoid:</p>

        <BulletList
          items={[
            "Looking at debt balances",
            "Reviewing spending",
            "Opening statements",
            "Creating budgets",
            "Forecasting future expenses",
            "Reviewing credit reports",
          ]}
        />

        <p>
          Traditional financial software can unintentionally reinforce this
          behavior by greeting users with negative balances, large debt totals,
          red warnings, complex reports, and endless spreadsheets.
        </p>

        <p>
          The information may be accurate, but accuracy alone does not create
          engagement.
        </p>
      </BenSection>

      <BenSection
        image="/ben-mastermind.png"
        title="The missing piece is motivation."
        reverse
      >
        <p>
          Behavioral science shows that positive reinforcement increases the
          likelihood that desired behaviors will be repeated.
        </p>

        <p>This principle is used successfully in:</p>

        <BulletList
          items={[
            "Fitness applications",
            "Educational platforms",
            "Language learning systems",
            "Professional training programs",
            "Video games",
          ]}
        />

        <p>
          People engage more when progress is visible. People stay motivated
          when effort is recognized. People build habits when actions are
          consistently rewarded.
        </p>

        <p>
          Yet many financial applications provide little or no positive
          reinforcement. The experience becomes: track spending, see problem,
          feel bad, leave.
        </p>

        <p>AskBen was built to change that pattern.</p>
      </BenSection>

      <BenSection
        image="/ben-mastermind.png"
        title="AskBen applies behavioral science to personal finance."
      >
        <p>
          AskBen is built on a simple premise: if people engage with their
          finances more often, they are more likely to improve them.
        </p>

        <p>Rather than relying only on reports, AskBen encourages engagement through:</p>

        <BulletList
          items={[
            "Reputation systems",
            "Achievements",
            "Progress tracking",
            "Financial milestones",
            "Positive reinforcement",
            "AI-guided coaching",
            "Debt campaigns",
            "Governor’s Office progression",
            "Streaks and accomplishments",
          ]}
        />

        <p>
          The objective is not to trivialize financial challenges. The objective
          is to make financial management feel approachable enough that people
          continue showing up.
        </p>

        <p>
          Every positive action matters. Every step forward is visible. Every
          improvement becomes part of a larger story.
        </p>
      </BenSection>

      <BenSection
        image="/ben-recovery.png"
        title="Rebuilding the Treasury."
        reverse
      >
        <p>Traditional finance apps focus on what is wrong.</p>

        <p>AskBen focuses on what is improving.</p>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
          <p>Instead of: “You still owe $5,000.”</p>
          <p className="mt-2">AskBen highlights: “You paid off $500 this month.”</p>
        </div>

        <p>The goal is not perfection. The goal is momentum.</p>

        <p>
          Every transaction imported. Every payment recorded. Every debt
          reviewed. Every bill planned. Each action helps rebuild the Treasury.
        </p>
      </BenSection>

      <BenSection
        image="/ben-winning.png"
        title="Celebrating progress."
      >
        <p>Progress deserves recognition.</p>

        <p>
          When people complete workouts, fitness apps celebrate. When people
          finish lessons, education apps celebrate. When people complete
          challenges, games celebrate.
        </p>

        <p>Financial progress deserves the same treatment.</p>

        <p>AskBen includes:</p>

        <BulletList
          items={[
            "Reputation points",
            "Ranks",
            "Achievements",
            "Streaks",
            "Debt campaign victories",
            "Financial milestones",
            "Ben’s reactions and encouragement",
          ]}
        />

        <p>
          These systems exist for one reason: to help people stay engaged long
          enough to improve their financial lives.
        </p>
      </BenSection>

      <BenSection
        image="/ben-goal-achieved.png"
        title="The future of financial wellness."
        reverse
      >
        <p>Personal finance is not simply a mathematics problem.</p>

        <p>It is a behavioral challenge.</p>

        <p>Most people already know they should:</p>

        <BulletList
          items={[
            "Spend less",
            "Save more",
            "Pay down debt",
            "Review finances regularly",
          ]}
        />

        <p>
          The challenge is maintaining motivation long enough to build those
          habits.
        </p>

        <p>
          AskBen combines financial tools, behavioral science, automation,
          artificial intelligence, and gamification to help users build
          healthier financial habits over time.
        </p>

        <p>
          The future of financial wellness is not just better information. It is
          better engagement. And better engagement leads to better decisions.
        </p>
      </BenSection>

      <Panel>
        <div className="text-center">
          <img
            src="/ben-head.png"
            alt="AskBen"
            className="mx-auto h-36 w-36 rounded-[2rem] border border-amber-200 bg-white object-contain p-4 shadow-xl"
          />

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
              The mission is simple: help people engage with their finances
              often enough to change them.
            </p>

            <p className="text-2xl font-black text-emerald-800">
              One payment. One decision. One victory. One rebuilt Treasury at a
              time.
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
    </AppShell>
  );
}
