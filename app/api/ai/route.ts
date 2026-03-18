import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSystemPrompt } from "@/lib/ai/systemPrompts";
import type { AiRequestBody } from "@/lib/ai/types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const reply =
      typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "Sorry, I couldn’t generate a response.";

    const action = (parsed.action ?? null) as BenAction;
    return { reply, action };
  } catch {
    return {
      reply: raw.trim() || "Sorry, I couldn’t generate a response.",
      action: null,
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AiRequestBody;
    const mode = body.mode ?? "money";
    const messages = body.messages ?? [];
    const context = body.context?.trim() ?? "";
    const financialSummary = body.financialSummary?.trim() ?? "";
    const stressScore = body.stressScore;

    const systemPrompt = getSystemPrompt(mode);

    const fullSystemPrompt = `
${systemPrompt}

This assistant is being used inside AskBen / Financial Triage.
The goal is to reduce financial stress, prioritize bills, and create practical short-term plans.

${
  typeof stressScore === "number"
    ? `Money Stress Score: ${stressScore}/100

Stress score scale:
- 80 to 100 = safe
- 60 to 79 = stable
- 40 to 59 = tight
- 20 to 39 = high stress
- 0 to 19 = critical`
    : ""
}

Financial Snapshot:
${financialSummary || "- No financial snapshot provided."}

Instructions:
- Use the snapshot as source of truth.
- Do not invent numbers.
- Prioritize essentials and near-term due dates.
- Explain the safest next actions.
- Keep the answer concise and actionable.
- If the user is only asking for advice, set action to null.
- Only return an action if the user is clearly asking to change data.
- If the user says they paid something, you may return add_payment.
- If the user says add a bill, you may return add_bill.
- If the user says delete/remove a payment, you may return delete_payment.
- If the user says delete/remove a bill, you may return delete_bill.
- If the user says add a debt, credit card, loan, or account, you may return add_debt.
- If the user says delete/remove a debt, credit card, loan, or account, you may return delete_debt.
- Prefer requiresConfirmation = true for destructive actions or if there is any ambiguity.
- Never invent IDs.
- If you do not know an id, return the best identifying fields you do know.
${context ? `\nAdditional context:\n${context}` : ""}

Return valid JSON only with this exact shape:
{
  "reply": "string",
  "action": null | {
    "type": "add_payment" | "add_bill" | "delete_payment" | "delete_bill" | "add_debt" | "delete_debt",
    "payload": { ... },
    "requiresConfirmation": true
  }
}
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
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

    return NextResponse.json({
      reply: parsed.reply,
      action: parsed.action,
    });
  } catch (error) {
    console.error("AI route error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response." },
      { status: 500 }
    );
  }
}
