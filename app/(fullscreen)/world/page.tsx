"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import WorldNavigationDrawer from "@/components/WorldNavigationDrawer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const [ready, setReady] = useState(false);
  const [hasLedger, setHasLedger] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      const [bills, debts] = await Promise.all([
        supabase.from("bills").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("debts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setHasLedger((bills.count ?? 0) + (debts.count ?? 0) > 0);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <main className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#040608]">
        <p className="animate-pulse text-lg text-[#c9a84c]" style={{ fontFamily: "EB Garamond, serif" }}>
          Checking the ledger…
        </p>
      </main>
    );
  }

  if (!hasLedger) {
    return (
      <main className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#100906] px-4">
        <section className="w-full max-w-lg rounded-3xl border border-[#c9a84c]/45 bg-[#100b07]/95 p-8 text-center text-[#f5e6c8] shadow-2xl">
          <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#c9a84c]">Franklin’s Landing</p>
          <h1 className="mt-3 font-cinzel text-3xl font-bold">The town waits on the ledger</h1>
          <p className="mt-4 text-base leading-7 text-[#d6c09a]">
            Add one bill or debt first. Ben needs a real number before the streets are worth walking.
          </p>
          <Link
            href="/bills"
            className="mt-7 inline-block rounded-2xl bg-[#c9a84c] px-8 py-4 font-cinzel text-base font-bold text-[#1a0f0a]"
          >
            Open the ledger
          </Link>
          <p className="mt-4 text-sm text-[#9a7d5a]">
            Or add a balance on the <Link href="/debt" className="underline">debt wall</Link>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[10000] bg-[#040608]">
      <ColonialTown3D />
      <WorldNavigationDrawer />
    </main>
  );
}
