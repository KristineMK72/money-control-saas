import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
              Financial Triage
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              Stop financial chaos.
              <span className="block text-cyan-300">
                See exactly what to pay first.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-white/70">
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
                className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Start Free
              </a>

              <a
                href="/signup"
                className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Login
              </a>
            </div>

            <p className="mt-4 text-sm text-white/60">
              Free trial feel. Upgrade later when you want smarter planning tools.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-cyan-300/20 bg-white/5 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
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
                  “America trusted me with the $100 bill.
                  <br />
                  I can probably help you with your electric bill too.”
                </p>

                <p className="mt-3 text-sm text-white/65">
                  Ben is your built-in money guide for bill priorities, weekly
                  planning, and calmer next steps.
                </p>

                <a
                  href="/chat"
                  className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-100"
                >
                  Ask Ben 💰
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold">Priority engine</h2>
            <p className="mt-2 text-sm text-white/70">
              See which bill matters most first based on due date and real-life
              risk.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold">Spending clarity</h2>
            <p className="mt-2 text-sm text-white/70">
              Track spending and payments separately so your money picture stays
              honest.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold">Screenshot import</h2>
            <p className="mt-2 text-sm text-white/70">
              Import transactions from screenshots instead of typing everything
              by hand.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
              Pro Monthly
            </div>
            <div className="mt-3 text-4xl font-black">
              $5<span className="text-lg text-white/60">/month</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Perfect for users who want screenshot import, smarter
              prioritization, and a calm weekly money plan.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>• Full dashboard + forecast</li>
              <li>• Screenshot transaction import</li>
              <li>• Crisis mode planning</li>
              <li>• Shareable financial plan</li>
            </ul>

            <a
              href="/signup?plan=monthly"
              className="mt-8 inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
            >
              Choose $5/month
            </a>
          </div>

          <div className="rounded-3xl border border-cyan-300/30 bg-cyan-400/10 p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Pro Yearly
            </div>
            <div className="mt-3 text-4xl font-black">
              $39<span className="text-lg text-white/60">/year</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Best value for users who want the full app all year and a lower
              effective monthly price.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>• Everything in Monthly</li>
              <li>• Lower yearly price</li>
              <li>• Better long-term planning</li>
              <li>• Ideal for serious users</li>
            </ul>

            <a
              href="/signup?plan=yearly"
              className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-100"
            >
              Choose $39/year
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
