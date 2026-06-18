import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BenPatternRow = {
  total_spend: number | string | null;
  spend_count: number | string | null;
  top_spend_category: string | null;
  top_merchant: string | null;
  top_payment_method: string | null;
  total_payments: number | string | null;
  total_income: number | string | null;
  bill_count: number | string | null;
  debt_count: number | string | null;
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getSmartBenInsight(userId: string) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("ben_user_patterns")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      mood: "thinking",
      text: "Ben is still gathering enough ledger evidence to spot thy patterns.",
    };
  }

  const row = data as BenPatternRow;

  const totalSpend = num(row.total_spend);
  const totalIncome = num(row.total_income);
  const totalPayments = num(row.total_payments);
  const spendCount = num(row.spend_count);
  const billCount = num(row.bill_count);
  const debtCount = num(row.debt_count);

  if (spendCount === 0) {
    return {
      mood: "thinking",
      text: "Ben says: Add a few spending entries and I can begin spotting habits, patterns, and sneaky Treasury leaks.",
    };
  }

  if (totalSpend > totalIncome && totalIncome > 0) {
    return {
      mood: "stern",
      text: `Ben says: The ledger shows ${money(
        totalSpend
      )} spent against ${money(
        totalIncome
      )} income. The Treasury needs a tighter watch on ${row.top_spend_category || "spending"}.`,
    };
  }

  if (row.top_merchant) {
    return {
      mood: "thinking",
      text: `Ben says: Thy most expensive merchant appears to be ${row.top_merchant}. That may be a worthy place to inspect before cutting anything else.`,
    };
  }

  if (row.top_payment_method) {
    return {
      mood: "mastermind",
      text: `Ben says: You most often spend with ${row.top_payment_method}. Watch that method closely; habits often hide in the easiest payment path.`,
    };
  }

  if (totalPayments > 0) {
    return {
      mood: "celebratory",
      text: `Ben says: Thou hast recorded ${money(
        totalPayments
      )} in payments. Excellent. Progress becomes powerful when it is visible.`,
    };
  }

  return {
    mood: "thinking",
    text: `Ben says: I see ${billCount} bills and ${debtCount} debts in the ledger. Keep adding entries and I shall become a sharper advisor.`,
  };
}
