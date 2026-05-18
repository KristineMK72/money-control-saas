"use client";

import Image from "next/image";
import Link from "next/link";

type MapLocation = {
  name: string;
  href: string;
  top: string;
  left: string;
  tone: "emerald" | "amber" | "cyan" | "rose" | "sky" | "yellow";
};

const locations: MapLocation[] = [
  {
    name: "Income",
    href: "/income",
    top: "24%",
    left: "48%",
    tone: "emerald",
  },
  {
    name: "Spend",
    href: "/spend",
    top: "27%",
    left: "68%",
    tone: "amber",
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    top: "47%",
    left: "49%",
    tone: "cyan",
  },
  {
    name: "Bills",
    href: "/bills",
    top: "47%",
    left: "78%",
    tone: "amber",
  },
  {
    name: "Debt",
    href: "/debt",
    top: "63%",
    left: "24%",
    tone: "rose",
  },
  {
    name: "Forecast",
    href: "/forecast",
    top: "84%",
    left: "50%",
    tone: "sky",
  },
  {
    name: "Achievements",
    href: "/achievements",
    top: "69%",
    left: "69%",
    tone: "yellow",
  },
];

function toneClass(tone: MapLocation["tone"]) {
  if (tone === "emerald") return "text-emerald-100 border-emerald-200/50";
  if (tone === "amber") return "text-amber-100 border-amber-200/50";
  if (tone === "cyan") return "text-cyan-100 border-cyan-200/50";
  if (tone === "rose") return "text-rose-100 border-rose-200/50";
  if (tone === "sky") return "text-sky-100 border-sky-200/50";
  return "text-yellow-100 border-yellow-200/50";
}

export default function BenWorldMap() {
  return (
    <section className="rounded-2xl border border-white/40 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="mb-6 rounded-2xl border border-white/80 bg-white/95 p-6 text-zinc-950 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
          BenWorld
        </p>

        <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
          Choose a building
        </h1>

        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-zinc-700 md:text-base">
          Explore your financial kingdom. Each building opens a working part of
          AskBen.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-amber-900/40 bg-[#1a1207] shadow-2xl">
        <Image
          src="/E318B394-AE7B-4031-8666-ADFF7BAF610C.png"
          alt="BenWorld Map"
          width={1600}
          height={1000}
          priority
          className="h-auto w-full select-none"
        />

        {locations.map((location) => (
          <Link
            key={location.name}
            href={location.href}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              top: location.top,
              left: location.left,
            }}
          >
            <div
              className={`rounded-full border bg-black/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-2xl backdrop-blur-md transition hover:scale-110 hover:bg-amber-950/90 md:px-4 md:text-xs ${toneClass(
                location.tone
              )}`}
            >
              {location.name}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
