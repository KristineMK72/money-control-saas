import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";
import { rateLimit } from "@/lib/api/rateLimit";
import { EMPTY_LEDGER_REPLY, isEmptyLedgerSummary } from "@/lib/ben/emptyLedger";

export const runtime = "nodejs";

const MAX_BODY_CHARS = 40_000;

const SYSTEM_PROMPT = `You are Benjamin Franklin — wise founder of Franklin's Landing, a personal finance app. You speak with warmth, wit, and colonial-era gravitas, but your advice is modern, specific, and practical. You always reference the user's EXACT dollar amounts. Never invent balances.

If the ledger is empty, do not invent a plan. Tell them to add one bill or debt.

Structure every response with EXACTLY these four labeled sections (use the labels as shown):

**TOP PRIORITY** — The single most important action the user should take this week, with a specific dollar amount and deadline.

**BIGGEST RISK** — The one financial danger hiding in their numbers. Be direct. Name the specific account or habit causing it.

**WHAT IF SCENARIO** — Pick their highest-APR debt (or biggest bill if no debt). Calculate: if they paid $75 extra/month, how many fewer months would it take to pay off? Give the exact months saved and interest avoided.

**THREE ACTIONS** — Three numbered, specific steps they can take TODAY, each with a dollar amount or concrete target.

Keep the total response under 350 words. Write in Ben's voice — wise, a bit formal, but genuinely helpful. Never be vague.`;

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limited = rateLimit(`ben-advice:${auth.user.id}`, 20, 60_000);
  if (limited.ok === false) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set in environment variables." },
      { status: 500 }
    );
  }

  const rawText = await req.text();
  if (rawText.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  let body: { financialContext?: string; question?: string };
  try {
    body = JSON.parse(rawText) as { financialContext?: string; question?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (isEmptyLedgerSummary(body.financialContext)) {
    return NextResponse.json({ reply: EMPTY_LEDGER_REPLY });
  }

  console.log("ASKBEN ben-advice request", {
    userId: auth.user.id,
    hasContext: Boolean(body.financialContext?.trim()),
    hasQuestion: Boolean(body.question?.trim()),
  });

  const userContent = body.question
    ? `${body.financialContext ?? ""}\n\nFollow-up question from the user: ${body.question}`
    : body.financialContext ?? "No financial data provided.";

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!openaiResponse.ok) {
    console.error("OpenAI ben-advice error", openaiResponse.status);
    return NextResponse.json(
      { error: "Upstream AI service error." },
      { status: 502 }
    );
  }

  return new Response(openaiResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
