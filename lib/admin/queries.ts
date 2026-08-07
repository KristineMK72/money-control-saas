import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OverviewStats = {
  dau: number;
  wau: number;
  mau: number;
  totalSessions: number;
  totalVisitorsToday: number;
  signedUpUsers: number;
  newUsers7d: number;
  returningSessions7d: number;
};

export type FunnelStep = {
  step: string;
  count: number;
};

export type FeatureStat = {
  feature: string;
  pathPrefix: string;
  uniqueUsers: number;
  pageViews: number;
};

export type LocationRow = {
  country: string | null;
  region: string | null;
  city: string | null;
  visits: number;
  lat: number | null;
  lng: number | null;
};

export type RetentionStats = {
  day1Rate: number | null;
  day7Rate: number | null;
  usersWithReturn: number;
  cohortSize: number;
};

export type SecurityRow = {
  id: number;
  created_at: string;
  event_type: string;
  pathname: string | null;
  country: string | null;
  risk_score: number | null;
  reason: string | null;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    isAdmin: Boolean(profile?.is_admin),
  };
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();

  const [todayRes, weekRes, monthRes, totalRes, usersRes, newUsersRes] =
    await Promise.all([
      supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart)
        .eq("is_bot", false),
      supabase
        .from("visitors")
        .select("ip_hash", { count: "exact", head: true })
        .gte("created_at", daysAgo(7))
        .eq("is_bot", false),
      supabase
        .from("visitors")
        .select("ip_hash", { count: "exact", head: true })
        .gte("created_at", daysAgo(30))
        .eq("is_bot", false),
      supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .eq("is_bot", false),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", daysAgo(7)),
    ]);

  const { data: weekIps } = await supabase
    .from("visitors")
    .select("ip_hash")
    .gte("created_at", daysAgo(7))
    .eq("is_bot", false)
    .limit(5000);

  const uniqueWeek = new Set(
    (weekIps || []).map((r) => r.ip_hash).filter(Boolean)
  ).size;

  const { data: monthIps } = await supabase
    .from("visitors")
    .select("ip_hash")
    .gte("created_at", daysAgo(30))
    .eq("is_bot", false)
    .limit(8000);

  const uniqueMonth = new Set(
    (monthIps || []).map((r) => r.ip_hash).filter(Boolean)
  ).size;

  const { data: todayIps } = await supabase
    .from("visitors")
    .select("ip_hash")
    .gte("created_at", todayStart)
    .eq("is_bot", false)
    .limit(3000);

  const uniqueToday = new Set(
    (todayIps || []).map((r) => r.ip_hash).filter(Boolean)
  ).size;

  const { data: weekHits } = await supabase
    .from("visitors")
    .select("ip_hash, created_at")
    .gte("created_at", daysAgo(7))
    .eq("is_bot", false)
    .limit(8000);

  const byIp = new Map<string, Set<string>>();
  for (const row of weekHits || []) {
    if (!row.ip_hash) continue;
    const day = String(row.created_at).slice(0, 10);
    if (!byIp.has(row.ip_hash)) byIp.set(row.ip_hash, new Set());
    byIp.get(row.ip_hash)!.add(day);
  }
  let returning = 0;
  byIp.forEach((days) => {
    if (days.size > 1) returning += 1;
  });

  return {
    dau: uniqueToday,
    wau: uniqueWeek,
    mau: uniqueMonth,
    totalSessions: totalRes.count ?? 0,
    totalVisitorsToday: todayRes.count ?? 0,
    signedUpUsers: usersRes.count ?? 0,
    newUsers7d: newUsersRes.count ?? 0,
    returningSessions7d: returning,
  };
}

export async function getFunnelSteps(): Promise<FunnelStep[]> {
  const supabase = await createSupabaseServerClient();

  const paths: { step: string; match: string }[] = [
    { step: "Landing /", match: "/" },
    { step: "Signup", match: "/signup" },
    { step: "Login", match: "/login" },
    { step: "Dashboard", match: "/dashboard" },
    { step: "Bills", match: "/bills" },
    { step: "Spend", match: "/spend" },
    { step: "Chat / Ben", match: "/chat" },
  ];

  const results: FunnelStep[] = [];

  for (const p of paths) {
    const { count } = await supabase
      .from("visitors")
      .select("id", { count: "exact", head: true })
      .eq("is_bot", false)
      .ilike("pathname", p.match === "/" ? "/" : `${p.match}%`);

    results.push({ step: p.step, count: count ?? 0 });
  }

  const eventNames = [
    "add_bill",
    "add_spend",
    "scan_receipt",
    "ask_ben",
    "add_debt",
  ];
  for (const name of eventNames) {
    const { count } = await supabase
      .from("product_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", name);
    results.push({
      step: `Event: ${name}`,
      count: count ?? 0,
    });
  }

  return results;
}

export async function getFeatureAdoption(): Promise<FeatureStat[]> {
  const supabase = await createSupabaseServerClient();

  const features = [
    { feature: "Dashboard", pathPrefix: "/dashboard" },
    { feature: "Bills", pathPrefix: "/bills" },
    { feature: "Spend", pathPrefix: "/spend" },
    { feature: "Debt", pathPrefix: "/debt" },
    { feature: "Income", pathPrefix: "/income" },
    { feature: "Forecast", pathPrefix: "/forecast" },
    { feature: "Chat / Ben", pathPrefix: "/chat" },
    { feature: "Crisis", pathPrefix: "/crisis" },
    { feature: "World", pathPrefix: "/world" },
    { feature: "Achievements", pathPrefix: "/achievements" },
    { feature: "Treasury", pathPrefix: "/treasury" },
  ];

  const out: FeatureStat[] = [];

  for (const f of features) {
    const { data, count } = await supabase
      .from("visitors")
      .select("ip_hash, user_id", { count: "exact" })
      .eq("is_bot", false)
      .ilike("pathname", `${f.pathPrefix}%`)
      .limit(4000);

    const unique = new Set<string>();
    for (const row of data || []) {
      if (row.user_id) unique.add(`u:${row.user_id}`);
      else if (row.ip_hash) unique.add(`ip:${row.ip_hash}`);
    }

    out.push({
      feature: f.feature,
      pathPrefix: f.pathPrefix,
      uniqueUsers: unique.size,
      pageViews: count ?? 0,
    });
  }

  return out.sort((a, b) => b.pageViews - a.pageViews);
}

export async function getLocations(): Promise<LocationRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("visitors")
    .select("country, region, city, lat_centroid, lng_centroid")
    .eq("is_bot", false)
    .not("country", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  const map = new Map<string, LocationRow>();

  for (const row of data || []) {
    const key = `${row.country || ""}|${row.region || ""}|${row.city || ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.visits += 1;
    } else {
      map.set(key, {
        country: row.country,
        region: row.region,
        city: row.city,
        visits: 1,
        lat: row.lat_centroid,
        lng: row.lng_centroid,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
}

export async function getRetention(): Promise<RetentionStats> {
  const supabase = await createSupabaseServerClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, created_at")
    .gte("created_at", daysAgo(30))
    .lte("created_at", daysAgo(8))
    .limit(500);

  if (!profiles || profiles.length === 0) {
    return {
      day1Rate: null,
      day7Rate: null,
      usersWithReturn: 0,
      cohortSize: 0,
    };
  }

  let day1 = 0;
  let day7 = 0;
  let anyReturn = 0;

  for (const p of profiles) {
    const signup = new Date(p.created_at).getTime();
    const { data: hits } = await supabase
      .from("visitors")
      .select("created_at")
      .eq("user_id", p.user_id)
      .gt("created_at", p.created_at)
      .limit(50);

    if (!hits || hits.length === 0) continue;
    anyReturn += 1;

    for (const h of hits) {
      const deltaDays =
        (new Date(h.created_at).getTime() - signup) / (1000 * 60 * 60 * 24);
      if (deltaDays >= 0.5 && deltaDays < 2) day1 += 1;
      if (deltaDays >= 6 && deltaDays < 9) day7 += 1;
    }
  }

  const cohortSize = profiles.length;
  return {
    day1Rate: cohortSize ? Math.min(1, day1 / cohortSize) : null,
    day7Rate: cohortSize ? Math.min(1, day7 / cohortSize) : null,
    usersWithReturn: anyReturn,
    cohortSize,
  };
}

export async function getSecurityEvents(limit = 50): Promise<SecurityRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("security_events")
    .select(
      "id, created_at, event_type, pathname, country, risk_score, reason"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as SecurityRow[];
}
