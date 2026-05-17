"use client";

import Link from "next/link";

type Room = {
  name: string;
  href: string;
  sign: string;
  district: string;
  description: string;
  status?: "calm" | "warning" | "danger" | "premium";
};

const rooms: Room[] = [
  {
    name: "Command Center",
    href: "/dashboard",
    sign: "Ledger Hall",
    district: "Main Square",
    description: "The full money snapshot and Ben's first read.",
    status: "calm",
  },
  {
    name: "Spend Market",
    href: "/spend",
    sign: "Receipts",
    district: "Market Row",
    description: "Scan receipts and expose the tiny purchases plotting together.",
    status: "warning",
  },
  {
    name: "Income Bank",
    href: "/income",
    sign: "Deposits",
    district: "Bank Street",
    description: "Track money coming in before it wanders off unsupervised.",
    status: "calm",
  },
  {
    name: "Income Plan",
    href: "/income-plan",
    sign: "Routes",
    district: "Bank Street",
    description: "Turn side work and paydays into a practical coverage plan.",
    status: "premium",
  },
  {
    name: "Bills Mailroom",
    href: "/bills",
    sign: "Due Dates",
    district: "Obligation Row",
    description: "Scan bills, sort obligations, and keep shutoff drama visible.",
    status: "warning",
  },
  {
    name: "Debt Ledger",
    href: "/debt",
    sign: "Balances",
    district: "Obligation Row",
    description: "Track balances, minimums, APRs, and the next account to attack.",
    status: "danger",
  },
  {
    name: "Payments Desk",
    href: "/payments",
    sign: "Proof",
    district: "Obligation Row",
    description: "Record payments so progress stops hiding in plain sight.",
    status: "calm",
  },
  {
    name: "Forecast Tower",
    href: "/forecast",
    sign: "Weather",
    district: "Planning Hill",
    description: "See what the month is likely to demand before it demands it.",
    status: "warning",
  },
  {
    name: "Calendar Road",
    href: "/calendar",
    sign: "Weeks",
    district: "Planning Hill",
    description: "Map due dates into weekly income targets.",
    status: "calm",
  },
  {
    name: "Credit Clinic",
    href: "/credit-health",
    sign: "Utilization",
    district: "Credit Quarter",
    description: "Spot score pressure and the cards asking for attention.",
    status: "warning",
  },
  {
    name: "Recovery Workshop",
    href: "/credit-recovery",
    sign: "Repair",
    district: "Credit Quarter",
    description: "Build a realistic path toward healthier utilization.",
    status: "premium",
  },
  {
    name: "Crisis Room",
    href: "/crisis",
    sign: "Triage",
    district: "Crisis Keep",
    description: "When money is tight, rank the next right move.",
    status: "danger",
  },
  {
    name: "Dispute Desk",
    href: "/dispute-letter",
    sign: "Letters",
    district: "Credit Quarter",
    description: "Draft credit dispute letters with cleaner structure.",
    status: "calm",
  },
  {
    name: "Goodwill Desk",
    href: "/goodwill-letter",
    sign: "Appeals",
    district: "Credit Quarter",
    description: "Ask for late-payment grace without sounding like a template.",
    status: "calm",
  },
  {
    name: "BenChat Study",
    href: "/chat",
    sign: "Counsel",
    district: "Main Square",
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

function roofClass(status?: Room["status"]) {
  if (status === "danger") return "bg-rose-700";
  if (status === "warning") return "bg-amber-600";
  if (status === "premium") return "bg-sky-700";
  return "bg-emerald-700";
}

function doorClass(status?: Room["status"]) {
  if (status === "danger") return "bg-rose-950";
  if (status === "warning") return "bg-amber-950";
  if (status === "premium") return "bg-sky-950";
  return "bg-emerald-950";
}

export default function BenWorldMap() {
  return (
    <section className="rounded-2xl border border-white/40 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="mb-6 rounded-2xl border border-white/80 bg-white/95 p-6 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
          BenWorld
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
          Choose a building
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-zinc-700 md:text-base">
          Each building is a working part of AskBen. Step into the district you
          need, and Ben will read the numbers in that room.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-[#ead6ad]/95 p-5 shadow-inner">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 bg-amber-900/10" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-amber-900/10" />

        <div className="relative grid gap-5 md:grid-cols-3">
          {rooms.map((room) => (
            <Link
              key={room.href}
              href={room.href}
              className={`group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl border p-4 text-zinc-950 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${statusClass(
                room.status
              )}`}
            >
              <div
                className={`absolute left-4 right-4 top-0 h-8 rounded-b-xl ${roofClass(
                  room.status
                )}`}
              />
              <div className="mt-7 rounded-2xl border border-zinc-950/10 bg-white/75 p-4 shadow-inner">
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-5 rounded border border-zinc-950/10 bg-sky-100/90"
                    />
                  ))}
                </div>
                <div
                  className={`mx-auto mt-4 h-12 w-10 rounded-t-xl ${doorClass(
                    room.status
                  )}`}
                />
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="rounded-2xl border border-zinc-950/10 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.18em]">
                  {room.district}
                </div>
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {statusLabel(room.status)}
                </span>
              </div>

              <div>
                <h2 className="mt-5 text-xl font-black">{room.name}</h2>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  {room.sign}
                </p>
                <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-zinc-700">
                  {room.description}
                </p>
                <div className="mt-4 text-sm font-black text-zinc-950">
                  Enter building
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
