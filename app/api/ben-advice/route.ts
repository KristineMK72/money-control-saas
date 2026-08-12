import { NextRequest } from "next/server";
import {
  AI_MAX_CONTEXT_CHARS,
  AI_MAX_FINANCIAL_SUMMARY_CHARS,
  boundedText,
  buildBenSystemPrompt,
} from "@/lib/ai/benCore";
import {
  aiErrorResponse,
  prepareBenRequest,
  readBoundedJson,
} from "@/lib/ai/server";

export const runtime = "edge";

type AdviceBody = {
  financialContext?: unknown;
  question?: unknown;
  stressScore?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "AskBen is not configured." },
        { status: 503 }
      );
    }

    const requestContext = await prepareBenRequest();
    const body = (await readBoundedJson(req)) as AdviceBody;
    const financialContext = boundedText(
      body.financialContext,
      AI_MAX_FINANCIAL_SUMMARY_CHARS
    );
    const question = boundedText(body.question, AI_MAX_CONTEXT_CHARS);
    const stressScore = Number.isFinite(Number(body.stressScore))
      ? Number(body.stressScore)
      : undefined;

    const systemPrompt = buildBenSystemPrompt({
      personaId: requestContext.personaId,
      financialSummary: financialContext,
      context: "AskBen dashboard financial briefing.",
      stressScore,
      mode: "briefing",
    });

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                question || "Provide my current financial briefing.",
            },
          ],
        }),
      }
    );

    if (!openaiResponse.ok || !openaiResponse.body) {
      console.error(
        "AskBen streaming provider request failed:",
        openaiResponse.status
      );
      return Response.json(
        { error: "Ben could not answer right now." },
        { status: 502 }
      );
    }

    // Preserve the existing raw OpenAI SSE contract consumed by Dashboard AiAdvisor.
    return new Response(openaiResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        Connection: "keep-alive",
        ...requestContext.rateLimitHeaders,
      },
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
