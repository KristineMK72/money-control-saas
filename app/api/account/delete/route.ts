import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/api/requireUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TABLES = [
  "spend_needs",
  "payments",
  "spend_entries",
  "income_entries",
  "income_sources",
  "side_hustles",
  "bills",
  "debts",
  "profiles",
] as const;

export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const supabase = await createSupabaseServerClient();
  const userId = auth.user.id;

  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      console.error(`Account delete failed on ${table}:`, error.message);
      // Continue — some tables may not exist in every env
    }
  }

  let authDeleted = false;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceKey && url) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Auth user delete failed:", error.message);
    } else {
      authDeleted = true;
    }
  }

  await supabase.auth.signOut();

  return NextResponse.json({
    ok: true,
    authDeleted,
    message: authDeleted
      ? "Account and data deleted."
      : "Financial data deleted. Sign-in account may remain if service role is not configured.",
  });
}
