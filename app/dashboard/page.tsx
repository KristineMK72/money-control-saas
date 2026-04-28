import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login"); // or /auth/login
  }

  // Fetch data server-side (RLS will now see the correct user)
  const [
    { data: billsData = [] },
    { data: debtsData = [] },
    { data: spendData = [] },
    { data: incomeData = [] },
    { data: paymentsData = [] },
  ] = await Promise.all([
    supabase.from("bills").select("*"),
    supabase.from("debts").select("*"),
    supabase.from("spend_entries").select("*").order("date_iso", { ascending: false }).limit(100),
    supabase.from("income_entries").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("payments").select("*").order("date_iso", { ascending: false }).limit(200),
  ]);

  return (
    <DashboardClient
      initialBills={billsData}
      initialDebts={debtsData}
      initialSpend={spendData}
      initialIncome={incomeData}
      initialPayments={paymentsData}
    />
  );
}
