import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lightweight product-event tracker for funnel + feature adoption.
 * Call from the client after key actions:
 *   fetch("/api/track-event", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ event_name: "add_bill", pathname: "/bills", meta: {} })
 *   })
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await req.json().catch(() => ({}));

    const event_name =
      typeof body.event_name === "string" && body.event_name.length > 0
        ? body.event_name.slice(0, 80)
        : null;

    if (!event_name) {
      return NextResponse.json(
        { success: false, error: "event_name required" },
        { status: 400 }
      );
    }

    const pathname =
      typeof body.pathname === "string" ? body.pathname.slice(0, 200) : null;
    const meta =
      body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? body.meta
        : {};

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("product_events").insert({
      user_id: user?.id ?? null,
      event_name,
      pathname,
      meta,
    });

    if (error) {
      console.error("product_events insert error:", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("track-event error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
