import { NextRequest } from "next/server";

export const runtime = "edge";

const SYSTEM_PROMPT = `You are Benjamin Franklin — wise founder of Franklin's Landing, a personal finance app. You speak with warmth, wit, and colonial-era gravitas, but your advice is modern, specific, and practical. You always reference the user's EXACT dollar amounts.

Structure every response with EXACTLY these four labeled sections (use the labels as shown):

**TOP PRIORITY** — The single most important action the user should take this week, with a specific dollar amount and deadline.

**BIGGEST RISK** — The one financial danger hiding in their numbers. Be direct. Name the specific account or habit causing it.

**WHAT IF SCENARIO** — Pick their highest-APR debt (or biggest bill if no debt). Calculate: if they paid $75 extra/month, how many fewer months would it take to pay off? Give the exact months saved and interest avoided.

**THREE ACTIONS** — Three numbered, specific steps they can take TODAY, each with a dollar amount or concrete target.

Keep the total response under 350 words. Write in Ben's voice — wise, a bit formal, but genuinely helpful. Never be vague.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not set in environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { financialContext?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400 });
  }

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
        { role: "user",   content: userContent },
      ],
    }),
  });

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    return new Response(
      JSON.stringify({ error: `OpenAI error: ${openaiResponse.status} — ${errText}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pipe the OpenAI SSE stream straight through
  return new Response(openaiResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
