import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPersona, type BenPersonaId } from "@/lib/ben/personas";
import { AI_BODY_LIMIT_BYTES } from "@/lib/ai/benCore";

type RateLimitResult = {
  allowed?: boolean;
  minute_remaining?: number;
  daily_remaining?: number;
  retry_after_seconds?: number;
};

export class AiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public retryAfter?: number
  ) {
    super(message);
  }
}

function limitFromEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > AI_BODY_LIMIT_BYTES) {
    throw new AiRequestError("Request is too large.", 413, "request_too_large");
  }

  const raw = await request.text();
  if (raw.length > AI_BODY_LIMIT_BYTES) {
    throw new AiRequestError("Request is too large.", 413, "request_too_large");
  }

  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new AiRequestError("Invalid JSON body.", 400, "invalid_json");
  }
}

export async function prepareBenRequest() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AiRequestError(
      "Please sign in before asking Ben.",
      401,
      "authentication_required"
    );
  }

  const minuteLimit = limitFromEnv("AI_RATE_LIMIT_PER_MINUTE", 12);
  const dailyLimit = limitFromEnv("AI_RATE_LIMIT_PER_DAY", 100);
  const { data: quotaData, error: quotaError } = await supabase.rpc(
    "consume_ai_quota",
    {
      p_minute_limit: minuteLimit,
      p_daily_limit: dailyLimit,
    }
  );

  if (quotaError) {
    console.error("AI quota check failed:", quotaError.code ?? "unknown");
    throw new AiRequestError(
      "Ben's request ledger is unavailable. Please try again shortly.",
      503,
      "rate_limiter_unavailable"
    );
  }

  const quota = (Array.isArray(quotaData) ? quotaData[0] : quotaData) as
    | RateLimitResult
    | null;
  if (!quota?.allowed) {
    const retryAfter = Math.max(1, Number(quota?.retry_after_seconds ?? 60));
    throw new AiRequestError(
      "Ben's quill needs a brief rest. Please try again shortly.",
      429,
      "rate_limit_exceeded",
      retryAfter
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("ben_voice")
    .eq("user_id", user.id)
    .maybeSingle<{ ben_voice?: string | null }>();

  if (profileError) {
    console.error("Ben persona load failed:", profileError.code ?? "unknown");
    throw new AiRequestError(
      "Ben could not load your chosen voice.",
      503,
      "persona_unavailable"
    );
  }

  const persona = getPersona(profile?.ben_voice);
  return {
    user,
    personaId: persona.id as BenPersonaId,
    rateLimitHeaders: {
      "X-RateLimit-Minute-Remaining": String(
        Math.max(0, Number(quota.minute_remaining ?? 0))
      ),
      "X-RateLimit-Day-Remaining": String(
        Math.max(0, Number(quota.daily_remaining ?? 0))
      ),
    },
  };
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AiRequestError) {
    const headers: Record<string, string> = {};
    if (error.retryAfter) headers["Retry-After"] = String(error.retryAfter);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers }
    );
  }

  console.error("AskBen request failed without financial payload details.");
  return NextResponse.json(
    { error: "Ben could not answer right now." },
    { status: 500 }
  );
}
