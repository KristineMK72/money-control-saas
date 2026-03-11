import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSystemPrompt } from "@/lib/ai/systemPrompts";
import type { AiRequestBody } from "@/lib/ai/types";
import { buildFinancialSnapshot } from "@/lib/ai/finance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AiRequestBody;
    const mode = body.mode ?? "money";
    const messages = body.messages ?? [];
    const context = body.context?.trim() ?? "";

    const supabase = createSupabaseServerClient();

    // TEMP: while auth/session wiring is still being finalized,
    // replace this with a real user id or remove this block.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: debts, error: debtsError } = await supabase
      .from("debts")
      .select(
        "name, kind, balance, min_payment, due_date, monthly_min_payment, is_monthly"
      )
      .eq("user_id", user.id);

    if (debtsError) {
      console.error("debts query error:", debtsError);
    }

    const { data: incomeEntries, error: incomeError } = await supabase
      .from("income_entries")
      .select("source, amount, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (incomeError) {
      console.error("income query error:", incomeError);
    }

    const { data: buckets, error: bucketsError } = await supabase
      .from("buckets")
      .select("name, saved, focus")
      .eq("user_id", user.id);

    if (bucketsError) {
      console.error("buckets query error:", bucketsError);
    }

    const availableCash = 0;

    const mappedBills =
      debts?.map((d) => ({
        name: d.name,
        amount:
          Number(d.min_payment ?? d.monthly_min_payment ?? d.balance ?? 0) || 0,
        dueDate: d.due_date ?? undefined,
        kind: d.kind ?? undefined,
        essential: ["power", "utility", "insurance", "rent", "housing"].some(
          (word) => (d.name || "").toLowerCase().includes(word)
        ),
      })) ?? [];

    const mappedIncome =
      incomeEntries?.map((i) => ({
        name: i.source || "Income",
        amount: Number(i.amount || 0),
        expectedDate: i.date ?? undefined,
      })) ?? [];

    const mappedBuckets =
      buckets?.map((b) => ({
        name: b.name,
        saved: Number(b.saved || 0),
        focus: !!b.focus,
      })) ?? [];

    const snapshot = buildFinancialSnapshot({
      availableCash,
      bills: mappedBills,
      expectedIncome: mappedIncome,
      buckets: mappedBuckets,
    });

    const systemPrompt = getSystemPrompt(mode);

    const fullSystemPrompt = `
${systemPrompt}

This assistant is being used inside Money Control Board.
The goal is to reduce financial stress, prioritize bills, and create practical short-term plans.

Money Stress Score: ${snapshot.stressScore}/100

Stress score scale:
- 80 to 100 = safe
- 60 to 79 = stable
- 40 to 59 = tight
- 20 to 39 = high stress
- 0 to 19 = critical

Financial Snapshot:
${snapshot.summaryText}

Instructions:
- Use the snapshot as the source of truth.
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

    return NextResponse.json({
      reply,
      stressScore: snapshot.stressScore,
      summary: {
        next7BillsTotal: snapshot.next7BillsTotal,
        next14BillsTotal: snapshot.next14BillsTotal,
        next7IncomeTotal: snapshot.next7IncomeTotal,
        shortfall7: snapshot.shortfall7,
      },
    });
  } catch (error) {
    console.error("AI route error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response." },
      { status: 500 }
    );
  }
}
