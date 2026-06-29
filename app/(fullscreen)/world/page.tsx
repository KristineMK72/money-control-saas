"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const ColonialTown3D = dynamic(
  () => import("@/components/ColonialTown3D"),
  { ssr: false }
);

export default function WorldPage() {
  return (
    <main className="w-screen bg-[#040608]" style={{ height: "100dvh" }}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-[#040608]">
            <p
              className="text-lg animate-pulse"
              style={{ color: "#c9a84c", fontFamily: "EB Garamond, serif" }}
            >
              Lighting the colonial lanterns…
            </p>
          </div>
        }
      >
        <ColonialTown3D />
      </Suspense>
    </main>
  );
}
