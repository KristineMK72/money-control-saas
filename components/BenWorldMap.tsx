"use client";

import Link from "next/link";

type Room = {
  name: string;
  href: string;
  sign: string;
  description: string;
  status?: "calm" | "warning" | "danger" | "premium";
};

const rooms: Room[] = [
  {
    name: "Command Center",
    href: "/dashboard",
    sign: "Ledger Hall",
    description: "The full money snapshot and Ben's first read.",
    status: "calm",
  },
  {
    name: "Spend Market",
    href: "/spend",
    sign: "Receipts",
    description: "Scan receipts and expose the tiny purchases plotting together.",
    status: "warning",
  },
  {
    name: "Income Bank",
    href: "/income",
    sign: "Deposits",
    description: "Track money coming in before it wanders off unsupervised.",
    status: "calm",
  },
  {
    name: "Income Plan",
    href: "/income-plan",
    sign: "Routes",
    description: "Turn side work and paydays into a practical coverage plan.",
    status: "premium",
  },
  {
    name: "Bills Mailroom",
    href: "/bills",
    sign: "Due Dates",
    description: "Scan bills, sort obligations, and keep shutoff drama visible.",
    status: "warning",
  },
  {
    name: "Debt Ledger",
    href: "/debt",
    sign: "Balances",
    description: "Track balances, minimums, APRs, and the next account to attack.",
    status: "danger",
  },
  {
    name: "Payments Desk",
    href: "/payments",
    sign: "Proof",
    description: "Record payments so progress stops hiding in plain sight.",
    status: "calm",
  },
  {
    name: "Forecast Tower",
    href: "/forecast",
    sign: "Weather",
    description: "See what the month is likely to demand before it demands it.",
    status: "warning",
  },
  {
    name: "Calendar Road",
    href: "/calendar",
    sign: "Weeks",
    description: "Map due dates into weekly income targets.",
    status: "calm",
  },
  {
    name: "Credit Clinic",
    href: "/credit-health",
    sign: "Utilization",
    description: "Spot score pressure and the cards asking for attention.",
    status: "warning",
  },
  {
    name: "Recovery Workshop",
    href: "/credit-recovery",
    sign: "Repair",
    description: "Build a realistic path toward healthier utilization.",
    status: "premium",
  },
  {
    name: "Crisis Room",
    href: "/crisis",
    sign: "Triage",
    description: "When money is tight, rank the next right move.",
    status: "danger",
  },
  {
    name: "Dispute Desk",
    href: "/dispute-letter",
    sign: "Letters",
    description: "Draft credit dispute letters with cleaner structure.",
    status: "calm",
  },
  {
    name: "Goodwill Desk",
    href: "/goodwill-letter",
    sign: "Appeals",
    description: "Ask for late-payment grace without sounding like a template.",
    status: "calm",
  },
  {
    name: "BenChat Study",
    href: "/chat",
    sign: "Counsel",
    description: "Ask Ben for clear, witty, money-control advice.",
    status: "premium",
  },
];

function statusClass(status?: Room["status"]) {
  if (status === "danger") return "border-rose-300 bg-rose-50";
  if (status === "warning") return "border-amber-300 bg-amber-50";
  if (status === "premium") return "border-sky-300 bg-sky-50";
  return "border-emerald-300 bg-emerald-50";
}

function statusLabel(status?: Room["status"]) {
  if (status === "danger") return "Needs attention";
  if (status === "warning") return "Check soon";
  if (status === "premium") return "Smart tools";
  return "Calm";
}

export default function BenWorldMap() {
  return (
    <section className="rounded-[2rem] border border-white/30 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="mb-6 rounded-2xl border border-white/80 bg-white/95 p-6 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
          BenWorld
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
          Choose a room
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-zinc-700 md:text-base">
          A colonial money map where each room has one job: reveal the next
          smart move. Ben provides the raised eyebrow; you keep the purse.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-amber-200/40 bg-[#ead6ad]/95 p-5 shadow-inner">
        <div className="grid gap-4 md:grid-cols-3">
          {rooms.map((room) => (
            <Link
              key={room.href}
              href={room.href}
              className={`group rounded-3xl border p-5 text-zinc-950 shadow-xl transition duration-300 hover:-translate-y-1 ${statusClass(
                room.status
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl border border-zinc-950/10 bg-white/65 px-3 py-2 text-xs font-black uppercase tracking-[0.18em]">
                  {room.sign}
                </div>
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {statusLabel(room.status)}
                </span>
              </div>

              <h2 className="mt-5 text-xl font-black">{room.name}</h2>
              <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-zinc-700">
                {room.description}
              </p>
              <div className="mt-4 text-sm font-black text-zinc-950">
                Enter room
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
