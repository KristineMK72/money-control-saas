import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { AiRequestBody } from "@/lib/ai/types";
import {
  AI_MAX_CONTEXT_CHARS,
  AI_MAX_FINANCIAL_SUMMARY_CHARS,
  boundedText,
  buildBenSystemPrompt,
  sanitizeChatMessages,
} from "@/lib/ai/benCore";
import {
  aiErrorResponse,
  prepareBenRequest,
  readBoundedJson,
} from "@/lib/ai/server";

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

export async function POST(req: Request) {
  try {
    const requestContext = await prepareBenRequest();
    const body = (await readBoundedJson(req)) as AiRequestBody;

    const messages = sanitizeChatMessages(body.messages);
    const context = boundedText(body.context, AI_MAX_CONTEXT_CHARS);
    const financialSummary = boundedText(
      body.financialSummary,
      AI_MAX_FINANCIAL_SUMMARY_CHARS
    );
    const stressScore = Number.isFinite(body.stressScore)
      ? Number(body.stressScore)
      : undefined;

    const fullSystemPrompt = buildBenSystemPrompt({
      personaId: requestContext.personaId,
      financialSummary,
      context,
      stressScore,
      mode: "actions",
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
      '{"reply":"Sorry, I couldn’t generate a response.","action":null}';

    const parsed = safeParseActionResponse(raw);

    return NextResponse.json(
      {
        reply: parsed.reply,
        action: parsed.action,
      },
      { headers: requestContext.rateLimitHeaders }
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}
