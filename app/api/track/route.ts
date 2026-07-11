import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { detectVisitorRisk, hashIp } from "@/lib/security/visitorRisk";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const body = await req.json().catch(() => ({}));

    const pathname =
      typeof body.pathname === "string" && body.pathname.length > 0
        ? body.pathname
        : "/";

    const referrer =
      typeof body.referrer === "string" && body.referrer.length > 0
        ? body.referrer
        : null;

    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    const country = req.headers.get("x-vercel-ip-country");
    const region = req.headers.get("x-vercel-ip-country-region");
    const city = req.headers.get("x-vercel-ip-city");

    const lat = req.headers.get("x-vercel-ip-latitude");
    const lng = req.headers.get("x-vercel-ip-longitude");

    const ipHash = hashIp(rawIp);

    const risk = detectVisitorRisk(userAgent, pathname);

    const { error: visitorError } = await supabase.from("visitors").insert({
      ip_hash: ipHash,
      user_agent: userAgent,
      pathname,
      referrer,
      country,
      region,
      city,
      lat_centroid: lat ? Number(lat) : null,
      lng_centroid: lng ? Number(lng) : null,
      is_bot: risk.isBot,
      is_suspicious: risk.isSuspicious,
      risk_score: risk.riskScore,
      reason: risk.reason,
    });

    if (visitorError) {
      console.error("Visitor insert error:", visitorError);
    }

    if (risk.isSuspicious || risk.isBot) {
      const { error: eventError } = await supabase
        .from("security_events")
        .insert({
          ip_hash: ipHash,
          event_type: risk.isBot ? "bot_detected" : "suspicious_visit",
          pathname,
          user_agent: userAgent,
          country,
          risk_score: risk.riskScore,
          reason: risk.reason,
        });

      if (eventError) {
        console.error("Security event insert error:", eventError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track visitor error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
