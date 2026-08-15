import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TABLES = [
  "profiles",
  "bills",
  "debts",
  "income_sources",
  "income_entries",
  "spend_entries",
  "spend_needs",
  "payments",
  "side_hustles",
] as const;

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const supabase = await createSupabaseServerClient();
  const userId = auth.user.id;

  const exportPayload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user: {
      id: userId,
      email: auth.user.email ?? null,
    },
  };

  for (const table of TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId);

    if (error) {
      // Table may not exist yet in every environment — skip quietly.
      exportPayload[table] = [];
      continue;
    }
    exportPayload[table] = data ?? [];
  }

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="askben-export-${userId.slice(0, 8)}.json"`,
    },
  });
}
