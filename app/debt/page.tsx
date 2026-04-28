// app/debt/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DebtClient from "./DebtClient";

export default async function DebtPage() {
  const supabase = await createSupabaseServerClient();   // ← Add "await" here

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Now fetch data safely
  const { data: debts, error } = await supabase
    .from("debts")
    .select("*")
    .order("due_day", { ascending: true });

  if (error) {
    console.error("Error fetching debts:", error);
  }

  return (
    <DebtClient 
      initialDebts={debts || []}
      user={user}
      // add other initial data if needed (e.g. initialPayments)
    />
  );
}
