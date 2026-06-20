export default function AchievementsPage() {
  return (
    <main className="min-h-screen bg-[url('/achievements-bg.png')] bg-cover bg-center px-4 py-24 text-white">
      <section className="mx-auto max-w-5xl rounded-3xl border border-amber-300/40 bg-black/55 p-6 shadow-2xl backdrop-blur">
        <h1 className="font-serif text-4xl font-bold text-amber-200">
          Trophy Room
        </h1>

        <p className="mt-3 text-lg text-white/85">
          Thy victories shall be recorded here — debts defeated, bills paid,
          savings grown, and streaks protected.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "First Payment Logged",
            "Debt Dungeon Escape",
            "30% Usage Drop",
            "Bill Paid On Time",
            "Seven Day Streak",
            "Emergency Fund Spark",
          ].map((title) => (
            <div
              key={title}
              className="rounded-2xl border border-amber-200/30 bg-stone-950/70 p-5"
            >
              <div className="text-3xl">🏆</div>
              <h2 className="mt-3 font-serif text-xl text-amber-100">
                {title}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Locked for now. Complete the quest to claim this honor.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
