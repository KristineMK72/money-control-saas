import DebtClient from "./DebtClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DebtPage() {
  const supabase = createSupabaseServerClient();

  const { data: debts, error } = await supabase
    .from("debts")
    .select("*")
    .order("due_day", { ascending: true });

  return (
    <DebtClient
      initialDebts={debts || []}
      initialError={error ? error.message : null}
    />
  );
}
