import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { AiRequestBody } from "@/lib/ai/types";
import { requireUser } from "@/lib/api/requireUser";
import { rateLimit } from "@/lib/api/rateLimit";
import { EMPTY_LEDGER_REPLY, isEmptyLedgerSummary } from "@/lib/ben/emptyLedger";

const MAX_BODY_CHARS = 80_000;
const MAX_MESSAGES = 40;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({ apiKey });
}

type BenAction =
  | {
      type: "add_payment";
      payload: {
        merchant: string;
        amount: number;
        date_iso?: string;
        debt_name?: string;
        debt_id?: string;
        note?: string;
      };
      requiresConfirmation?: boolean;
    }
  | {
      type: "add_bill";
      payload: {
        name: string;
        amount: number;
        due_date?: string;
        due_day?: number;
        is_monthly?: boolean;
        kind?: string;
        category?: string;
        priority?: number;
        focus?: boolean;
        note?: string;
      };
      requiresConfirmation?: boolean;
    }
  | {
      type: "delete_payment";
      payload: {
        payment_id?: string;
        merchant?: string;
        amount?: number;
        date_iso?: string;
      };
      requiresConfirmation?: boolean;
    }
  | {
      type: "delete_bill";
      payload: {
        bill_id?: string;
        name?: string;
      };
      requiresConfirmation?: boolean;
    }
  | {
      type: "add_debt";
      payload: {
        name: string;
        balance: number;
        kind?: string;
        min_payment?: number;
        monthly_min_payment?: number;
        due_date?: string;
        due_day?: number;
        is_monthly?: boolean;
        note?: string;
      };
      requiresConfirmation?: boolean;
    }
  | {
      type: "delete_debt";
      payload: {
        debt_id?: string;
        name?: string;
      };
      requiresConfirmation?: boolean;
    }
  | null;

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function safeParseActionResponse(raw: string): {
  reply: string;
  action: BenAction;
} {
  const cleaned = stripCodeFences(raw);

  try {
    const parsed = JSON.parse(cleaned) as {
      reply?: unknown;
      action?: unknown;
    };

    return {
      reply:
        typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply.trim()
          : "Sorry, I couldn’t generate a response.",
      action: (parsed.action ?? null) as BenAction,
    };
  } catch {
    return {
      reply: raw.trim() || "Sorry, I couldn’t generate a response.",
      action: null,
    };
  }
}

function buildSystemPrompt({
  financialSummary,
  context,
  stressScore,
}: {
  financialSummary: string;
  context: string;
  stressScore?: number;
}) {
  return `
You are AskBen: Benjamin Franklin serving as a modern financial triage advisor.

VOICE:
- Sound wise, practical, calm, and intelligent.
- Use light Benjamin Franklin / colonial flavor only occasionally.
- Do not sound like Shakespeare.
- Prioritize clear financial advice over roleplay.

MISSION:
- Reduce the user's financial stress.
- Help them decide what to pay first.
- Give one next move.
- Never shame the user.
- Never invent numbers, due dates, bills, debts, or income.
- If the ledger is empty, tell them to add one bill or debt and stop.

${
  typeof stressScore === "number"
    ? `MONEY STRESS SCORE:\n${stressScore}/100`
    : ""
}

APP FINANCIAL DATA — SOURCE OF TRUTH:
${financialSummary || "- No financial summary was sent from the app."}

CRITICAL DATA RULES:
- The APP FINANCIAL DATA above is the source of truth.
- Do not invent balances.
- If bills and debts are both empty, do not rank fictional bills.
- When asked what to pay first, rank by overdue, due soon, essentials, minimum debt payments.

ACTION RULES:
- Return an action only when the user clearly asks to change data.
- If the user is only asking for advice, action must be null.

${context ? `ADDITIONAL PAGE CONTEXT:\n${context}` : ""}

Return valid JSON only with this exact shape:
{
  "reply": "string",
  "action": null | { "type": "add_payment" | "add_bill" | "delete_payment" | "delete_bill" | "add_debt" | "delete_debt", "payload": { ... }, "requiresConfirmation": true }
}
`.trim();
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const limited = rateLimit(`ai:${auth.user.id}`, 30, 60_000);
    if (limited.ok === false) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        }
      );
    }

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    let body: AiRequestBody;
    try {
      body = JSON.parse(rawText) as AiRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const messages = (body.messages ?? []).slice(-MAX_MESSAGES);
    const context = body.context?.trim() ?? "";
    const financialSummary = body.financialSummary?.trim() ?? "";
    const stressScore = body.stressScore;

    if (isEmptyLedgerSummary(financialSummary)) {
      return NextResponse.json({ reply: EMPTY_LEDGER_REPLY, action: null });
    }

    console.log("ASKBEN AI request", {
      userId: auth.user.id,
      messageCount: messages.length,
      hasSummary: financialSummary.length > 0,
      hasContext: context.length > 0,
    });

    const fullSystemPrompt = buildSystemPrompt({
      financialSummary,
      context,
      stressScore,
    });

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: fullSystemPrompt,
        },
        ...messages,
      ],
    });

    const raw =
      completion.choices[0]?.message?.content?.trim() ||
      '{"reply":"Sorry, I couldn\u2019t generate a response.","action":null}';

    const parsed = safeParseActionResponse(raw);

    return NextResponse.json({
      reply: parsed.reply,
      action: parsed.action,
    });
  } catch (error) {
    console.error("AI route error:", error instanceof Error ? error.message : "unknown");

    return NextResponse.json(
      {
        error: "Failed to generate AI response.",
      },
      { status: 500 }
    );
  }
}
