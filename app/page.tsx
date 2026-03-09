export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-24">
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
            Upload bills, track spending, and get a calm, clear action plan for
            what matters most today.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Preview App
            </a>

            <a
              href="/signup"
              className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/5"
            >
              Start Free
            </a>

            <a
              href="/bills"
              className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/5"
            >
              Add Bills
            </a>
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
      </section>
    </main>
  );
}
