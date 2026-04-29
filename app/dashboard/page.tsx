// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profileData },
    { data: billsData },
    { data: debtsData },
    { data: spendData },
    { data: incomeData },
    { data: paymentsData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, onboarding_complete, is_premium")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase.from("bills").select("*"),

    supabase.from("debts").select("*"),

    supabase
      .from("spend_entries")
      .select("*")
      .order("date_iso", { ascending: false })
      .limit(100),

    supabase
      .from("income_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("payments")
      .select("*")
      .order("date_iso", { ascending: false })
      .limit(200),
  ]);

  const profile = profileData ?? {
    display_name: null,
    onboarding_complete: false,
    is_premium: false,
  };

  return (
    <DashboardClient
      profile={profile}
      initialBills={billsData ?? []}
      initialDebts={debtsData ?? []}
      initialSpend={spendData ?? []}
      initialIncome={incomeData ?? []}
      initialPayments={paymentsData ?? []}
      user={user}
    />
  );
}
