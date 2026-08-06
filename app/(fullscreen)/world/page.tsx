"use client";

import dynamic from "next/dynamic";
import WorldNavigationDrawer from "@/components/WorldNavigationDrawer";

const ColonialTown3D = dynamic(
  () => import("@/components/ColonialTown3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#040608]">
        <p className="animate-pulse text-lg text-[#c9a84c]" style={{ fontFamily: "EB Garamond, serif" }}>
          Lighting the colonial lanterns…
        </p>
      </div>
    ),
  }
);

export default function WorldPage() {
  return (
    <main className="fixed inset-0 z-[10000] bg-[#040608]">
      <ColonialTown3D />
      <WorldNavigationDrawer />
    </main>
  );
}
