// app/dashboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    profileRes,
    billsRes,
    debtsRes,
    spendRes,
    incomeRes,
    paymentsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, onboarding_complete, is_premium")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("bills").select("*").eq("user_id", user.id),
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase
      .from("spend_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date_iso", { ascending: false })
      .limit(100),
    supabase
      .from("income_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("date_iso", { ascending: false })
      .limit(200),
  ]);

  // 🔍 LOG every error to Vercel function logs
  const results = { profileRes, billsRes, debtsRes, spendRes, incomeRes, paymentsRes };
  const errors: Record<string, string> = {};
  for (const [name, res] of Object.entries(results)) {
    if (res.error) {
      console.error(`[dashboard] ${name} failed:`, res.error);
      errors[name] = res.error.message;
    } else {
      console.log(`[dashboard] ${name} rows:`, Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0);
    }
  }

  // 🔍 In dev only, render the errors so you can see them in the browser
  if (process.env.NODE_ENV !== "production" && Object.keys(errors).length > 0) {
    return (
      <pre className="p-6 text-red-400 whitespace-pre-wrap text-xs">
        {JSON.stringify(errors, null, 2)}
      </pre>
    );
  }

  const profile = profileRes.data ?? {
    display_name: null,
    onboarding_complete: false,
    is_premium: false,
  };

  return (
    <DashboardClient
      profile={profile}
      initialBills={billsRes.data ?? []}
      initialDebts={debtsRes.data ?? []}
      initialSpend={spendRes.data ?? []}
      initialIncome={incomeRes.data ?? []}
      initialPayments={paymentsRes.data ?? []}
      user={user}
    />
  );
}
