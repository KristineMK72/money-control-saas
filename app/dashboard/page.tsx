// app/dashboard/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";   // We'll move the UI here

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");   // or wherever your login page is
  }

  // Fetch ALL data on the server with proper auth context
  const [
    { data: billsData },
    { data: debtsData },
    { data: spendData },
    { data: incomeData },
    { data: paymentsData },
  ] = await Promise.all([
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

  return (
    <DashboardClient
      initialBills={billsData || []}
      initialDebts={debtsData || []}
      initialSpend={spendData || []}
      initialIncome={incomeData || []}
      initialPayments={paymentsData || []}
      userId={user.id}
    />
  );
}
