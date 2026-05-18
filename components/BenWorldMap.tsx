import Link from "next/link";

type BuildingLink = {
  label: string;
  href: string;
  top: string;
  left: string;
};

const buildings: BuildingLink[] = [
  {
    label: "Income",
    href: "/income",
    top: "20%",
    left: "52%",
  },
  {
    label: "Spend",
    href: "/spend",
    top: "23%",
    left: "72%",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    top: "43%",
    left: "50%",
  },
  {
    label: "Bills",
    href: "/bills",
    top: "43%",
    left: "82%",
  },
  {
    label: "Debt",
    href: "/debt",
    top: "64%",
    left: "24%",
  },
  {
    label: "Achievements",
    href: "/achievements",
    top: "69%",
    left: "71%",
  },
  {
    label: "Forecast",
    href: "/forecast",
    top: "84%",
    left: "50%",
  },
];

export default function BenWorldMap() {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#120d08] shadow-2xl">
      {/* HEADER CARD */}

      <div className="border-b border-white/10 bg-black/30 p-5 md:p-8">
        <div className="rounded-[1.5rem] bg-white/95 p-5 text-zinc-950 shadow-2xl md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-700">
            BenWorld
          </p>

          <h1 className="mt-3 text-4xl font-black leading-none md:text-6xl">
            Choose a building
          </h1>

          <p className="mt-4 max-w-2xl text-lg font-bold leading-relaxed text-zinc-700 md:text-2xl">
            Explore your financial kingdom. Each building opens a working part
            of AskBen.
          </p>
        </div>
      </div>

      {/* MAP */}

      <div className="relative">
        <img
          src="/E318B394-AE7B-4031-8666-ADFF7BAF610C.png"
          alt="BenWorld financial kingdom map"
          className="block w-full select-none"
          draggable={false}
        />

        {/* subtle dark overlay */}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/15" />

        {/* BUILDING BUTTONS */}

        {buildings.map((building) => (
          <Link
            key={building.href}
            href={building.href}
            className="
              absolute
              z-10
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              border
              border-amber-100/60
              bg-black/82
              px-2
              py-1
              text-[9px]
              font-black
              uppercase
              tracking-[0.14em]
              text-cyan-100
              shadow-xl
              backdrop-blur-md
              transition-all
              duration-200
              hover:scale-105
              hover:bg-black/92
              md:px-4
              md:py-2
              md:text-xs
            "
            style={{
              top: building.top,
              left: building.left,
            }}
          >
            {building.label}
          </Link>
        ))}
      </div>

      {/* FOOTER */}

      <div className="grid gap-3 border-t border-white/10 bg-black/25 p-4 text-sm font-semibold text-white/70 md:grid-cols-3 md:p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Income, spend, bills, debt, and forecast all connect together inside
          your financial kingdom.
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          BenWorld transforms budgeting into an interactive experience instead
          of spreadsheets and stress.
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Future updates can unlock achievements, premium buildings, streaks,
          and XP progression.
        </div>
      </div>
    </section>
  );
}
