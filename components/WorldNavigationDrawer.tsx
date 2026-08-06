"use client";

import { useEffect, useState } from "react";

const links = [
  ["Governor's Office", "/dashboard"],
  ["Spend", "/spend"],
  ["Income Ledger", "/income"],
  ["Post Office", "/bills"],
  ["Payment Hall", "/payments"],
  ["Forecast", "/forecast"],
  ["Town Calendar", "/calendar"],
  ["Achievements", "/achievements"],
  ["Ask Ben", "/chat"],
  ["Settings", "/settings"],
] as const;

export default function WorldNavigationDrawer() {
  const [open, setOpen] = useState(false);

  function toggle() {
    if (document.pointerLockElement) document.exitPointerLock();
    setOpen((current) => !current);
  }

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "m") return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      event.preventDefault();
      if (document.pointerLockElement) document.exitPointerLock();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3">
      <div className="w-full max-w-4xl">
        <div
          id="world-navigation"
          className="pointer-events-auto overflow-hidden rounded-b-3xl border-x border-b border-[#c9a84c]/45 bg-[#100b07]/95 shadow-2xl backdrop-blur-xl transition-[max-height,opacity] duration-300"
          style={{
            maxHeight: open ? "min(520px, calc(100vh - 44px))" : 0,
            opacity: open ? 1 : 0,
            overflowY: open ? "auto" : "hidden",
            visibility: open ? "visible" : "hidden",
          }}
          aria-hidden={!open}
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#c9a84c]/25 px-5 py-4">
            <div>
              <p className="font-cinzel text-xs uppercase tracking-[0.28em] text-[#c9a84c]">AskBen</p>
              <p className="font-cormorant text-xl font-bold text-[#fff7df]">Franklin&apos;s Landing</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-[#c9a84c]/35 px-3 py-2 text-sm font-bold text-[#f7e6b1] hover:bg-[#c9a84c]/10"
              aria-label="Close navigation"
            >
              Close
            </button>
          </div>
          <nav aria-label="Franklin's Landing navigation" className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-5">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-xl border border-[#c9a84c]/25 bg-black/25 px-3 py-3 text-center font-cormorant text-base font-bold text-[#fff7df] transition hover:border-[#c9a84c]/70 hover:bg-[#c9a84c]/15"
              >
                {label}
              </a>
            ))}
          </nav>
          <p className="pb-3 text-center text-xs text-[#c9a84c]/65">Press M anytime to open or close this menu.</p>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="world-navigation"
            className="pointer-events-auto rounded-b-2xl border-x border-b border-[#c9a84c]/55 bg-[#100b07]/95 px-6 py-2 font-cinzel text-xs font-bold uppercase tracking-[0.18em] text-[#f4d675] shadow-xl backdrop-blur-xl hover:bg-[#21170d]"
          >
            {open ? "Close menu ︿" : "Explore AskBen ﹀"}
          </button>
        </div>
      </div>
    </div>
  );
}
