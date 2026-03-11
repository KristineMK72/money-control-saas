"use client";


import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AppTabs() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/signup");
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <a
        href="/dashboard"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Dashboard
      </a>

      <a
        href="/bills"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Bills
      </a>

      <a
        href="/income"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Income
      </a>

      <a
        href="/spend"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Spending
      </a>

      <a
        href="/debt"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Credit & Loans
      </a>

      <a
        href="/forecast"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Forecast
      </a>

      <a
        href="/crisis"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Crisis Mode
      </a>

      <a
        href="/signup"
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Account
      </a>

      <button
        onClick={handleLogout}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
      >
        Logout
      </button>
    </div>
  );
}
