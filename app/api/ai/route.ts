import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSystemPrompt } from "@/lib/ai/systemPrompts";
import type { AiRequestBody } from "@/lib/ai/types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
${context ? `\nAdditional context:\n${context}` : ""}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: fullSystemPrompt,
        },
        ...messages,
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t generate a response.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI route error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response." },
      { status: 500 }
    );
  }
}
