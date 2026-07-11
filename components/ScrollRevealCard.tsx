"use client";

import { useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  image?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function ScrollRevealCard({
  title,
  subtitle,
  image,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="overflow-hidden rounded-[28px] border border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-50 shadow-2xl"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <div>
          <h2 className="text-2xl font-black text-amber-950">
            📜 {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm font-semibold text-amber-800">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`text-2xl transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </div>
      </button>

      <div
        className={`transition-all duration-500 ease-in-out ${
          open ? "max-h-[4000px]" : "max-h-0"
        } overflow-hidden`}
      >
        <div className="border-t border-amber-200 bg-white/60 p-6">
          {image && (
            <img
              src={image}
              alt={title}
              className="mx-auto mb-5 h-40 w-40 object-contain"
            />
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
