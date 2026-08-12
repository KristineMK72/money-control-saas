import { NextResponse } from "next/server";
import { ACCOUNT_EXPORT_TABLES } from "@/lib/account/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please sign in to export your data." },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Account export is not configured." },
      { status: 503 }
    );
  }

  const tableResults = await Promise.all(
    ACCOUNT_EXPORT_TABLES.map(async (table) => {
      const { data, error } = await admin
        .from(table)
        .select("*")
        .eq("user_id", user.id);
      return { table, data, error };
    })
  );

  const failed = tableResults.find((result) => result.error);
  if (failed) {
    console.error(
      `Account export failed for ${failed.table}:`,
      failed.error?.code ?? "unknown"
    );
    return NextResponse.json(
      { error: "We could not prepare a complete export. Nothing was omitted." },
      { status: 500 }
    );
  }

  const data = Object.fromEntries(
    tableResults.map((result) => [result.table, result.data ?? []])
  );
  const exportedAt = new Date().toISOString();
  const filenameDate = exportedAt.slice(0, 10);

  return NextResponse.json(
    {
      format: "askben-account-export",
      version: 1,
      exported_at: exportedAt,
      account: {
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        user_metadata: user.user_metadata,
      },
      data,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="askben-data-${filenameDate}.json"`,
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
