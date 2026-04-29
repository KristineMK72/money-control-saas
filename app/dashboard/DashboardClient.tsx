{/* ─────────────────────────────
    TOP SUMMARY ROW
──────────────────────────── */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
    <p className="text-xs text-zinc-400">Monthly Income</p>
    <p className="text-2xl font-semibold text-emerald-400">
      ${monthlyIncome.toLocaleString()}
    </p>
  </div>

  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
    <p className="text-xs text-zinc-400">Monthly Spend</p>
    <p className="text-2xl font-semibold text-red-400">
      ${monthlySpend.toLocaleString()}
    </p>
  </div>

  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
    <p className="text-xs text-zinc-400">Net Cashflow</p>
    <p className={`text-2xl font-semibold ${netCashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
      ${netCashflow.toLocaleString()}
    </p>
  </div>
</section>

{/* ─────────────────────────────
    BEN'S TAKE
──────────────────────────── */}
<section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-2">
  <h2 className="text-lg font-semibold">Ben’s Take</h2>
  <p className="text-sm text-zinc-400">
    {benMood === "relieved" &&
      "Good news — your month is looking stable. Keep this momentum going."}
    {benMood === "concerned" &&
      "You’re close to breaking even. A few adjustments could stabilize things."}
    {benMood === "alarmed" &&
      "Your spending is outpacing income. Let’s focus on the biggest pressure points."}
  </p>
</section>

{/* ─────────────────────────────
    UPCOMING (7 DAYS)
──────────────────────────── */}
<section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold">Upcoming (7 days)</h2>
    <button
      onClick={() => setShowUpcomingModal(true)}
      className="text-xs text-emerald-400 hover:text-emerald-300"
    >
      View all
    </button>
  </div>

  {upcoming.length === 0 ? (
    <p className="text-sm text-zinc-500">Nothing due in the next week.</p>
  ) : (
    <ul className="space-y-2">
      {upcoming.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-lg bg-zinc-800 p-3"
        >
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-zinc-400">
              Due {item.dueDate.toLocaleDateString()}
            </p>
          </div>
          <p className="font-semibold text-emerald-400">
            ${item.amount.toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  )}
</section>

{/* ─────────────────────────────
    PAYMENTS THIS MONTH
──────────────────────────── */}
<section className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
    <p className="text-xs text-zinc-400">Bill Payments (This Month)</p>
    <p className="text-xl font-semibold text-emerald-400">
      ${billPaymentsThisMonth.toLocaleString()}
    </p>
  </div>

  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
    <p className="text-xs text-zinc-400">Debt Payments (This Month)</p>
    <p className="text-xl font-semibold text-emerald-400">
      ${debtPaymentsThisMonth.toLocaleString()}
    </p>
  </div>
</section>

{/* ─────────────────────────────
    RECENT ACTIVITY
──────────────────────────── */}
<section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
  <h2 className="text-lg font-semibold">Recent Activity</h2>

  {spend.length === 0 && payments.length === 0 ? (
    <p className="text-sm text-zinc-500">No recent activity yet.</p>
  ) : (
    <ul className="space-y-2">
      {[...spend.slice(0, 5), ...payments.slice(0, 5)]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg bg-zinc-800 p-3"
          >
            <div>
              <p className="font-medium">
                {"merchant" in item ? item.merchant : item.note || "Payment"}
              </p>
              <p className="text-xs text-zinc-400">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <p className="font-semibold text-emerald-400">
              ${item.amount.toLocaleString()}
            </p>
          </li>
        ))}
    </ul>
  )}
</section>
