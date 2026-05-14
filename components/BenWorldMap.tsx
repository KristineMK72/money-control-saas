"use client";

import Link from "next/link";

type Room = {
  name: string;
  href: string;
  emoji: string;
  description: string;
  status?: "calm" | "warning" | "danger" | "premium";
};

const rooms: Room[] = [
  {
    name: "Command Center",
    href: "/dashboard",
    emoji: "🏛️",
    description: "Your full money snapshot.",
    status: "calm",
  },
  {
    name: "Bank Room",
    href: "/income",
    emoji: "🏦",
    description: "Track money coming in.",
    status: "calm",
  },
  {
    name: "Market",
    href: "/spend",
    emoji: "🛒",
    description: "Track spending and scans.",
    status: "warning",
  },
  {
    name: "Mailroom",
    href: "/bills",
    emoji: "📬",
    description: "Bills, due dates, payments.",
    status: "calm",
  },
  {
    name: "Debt Dungeon",
    href: "/debts",
    emoji: "🐉",
    description: "Attack balances and minimums.",
    status: "danger",
  },
  {
    name: "Forecast Tower",
    href: "/forecast",
    emoji: "🔭",
    description: "See what’s coming.",
    status: "warning",
  },
  {
    name: "Trophy Room",
    href: "/achievements",
    emoji: "🏆",
    description: "Levels, XP, and wins.",
    status: "premium",
  },
];

function statusClass(status?: Room["status"]) {
  if (status === "danger") {
    return "border-red-300 bg-red-50/90 shadow-red-900/20";
  }

  if (status === "warning") {
    return "border-amber-300 bg-amber-50/90 shadow-amber-900/20";
  }

  if (status === "premium") {
    return "border-purple-300 bg-purple-50/90 shadow-purple-900/20";
  }

  return "border-emerald-300 bg-emerald-50/90 shadow-emerald-900/20";
}

function statusLabel(status?: Room["status"]) {
  if (status === "danger") return "Needs attention";
  if (status === "warning") return "Check soon";
  if (status === "premium") return "Premium room";
  return "Calm";
}

export default function BenWorldMap() {
  return (
    <section className="rounded-[2rem] border border-white/25 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-md md:p-8">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
          BenWorld
        </p>

        <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">
          Choose a room
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-200">
          Walk through your money world one room at a time. Ben will yell
          politely from the hallway if something looks spicy.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-br from-slate-900/80 to-emerald-950/70 p-5">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-amber-400 blur-3xl" />
        </div>

        <div className="relative grid gap-4 md:grid-cols-3">
          {rooms.map((room) => (
            <Link
              key={room.href}
              href={room.href}
              className={`group rounded-3xl border p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.02] ${statusClass(
                room.status
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-4xl transition group-hover:scale-110">
                  {room.emoji}
                </div>

                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {statusLabel(room.status)}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-black text-zinc-950">
                {room.name}
              </h2>

              <p className="mt-2 text-sm font-semibold text-zinc-700">
                {room.description}
              </p>

              <div className="mt-4 text-sm font-black text-zinc-950">
                Enter room →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
