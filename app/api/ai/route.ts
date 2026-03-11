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

    const mode = body.mode ?? "general";
    const messages = body.messages ?? [];
    const context = body.context?.trim();

    const systemPrompt = getSystemPrompt(mode);

    const fullSystemPrompt = context
      ? `${systemPrompt}

Additional trusted context for this conversation:
${context}`
      : systemPrompt;

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
