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

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("auth.getUser error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const { data: bills, error: billsError } = await supabase
      .from("bills")
      .select(
        "name, kind, category, target, saved, due_date, due, priority, focus, balance, min_payment, is_monthly, monthly_target, due_day"
      )
      .eq("user_id", userId);

    if (billsError) {
      console.error("bills query error:", billsError);
    }

    const { data: debts, error: debtsError } = await supabase
      .from("debts")
      .select(
        "name, kind, balance, min_payment, due_date, monthly_min_payment, is_monthly, due_day"
      )
      .eq("user_id", userId);

    if (debtsError) {
      console.error("debts query error:", debtsError);
    }

    const { data: incomeEntries, error: incomeError } = await supabase
      .from("income_entries")
      .select("source_name, amount, date_iso")
      .eq("user_id", userId)
      .order("date_iso", { ascending: false });

    if (incomeError) {
      console.error("income query error:", incomeError);
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("merchant, amount, date_iso")
      .eq("user_id", userId)
      .order("date_iso", { ascending: false })
      .limit(50);

    if (paymentsError) {
      console.error("payments query error:", paymentsError);
    }

    const { data: spendEntries, error: spendError } = await supabase
      .from("spend_entries")
      .select("merchant, amount, category, date_iso")
      .eq("user_id", userId)
      .order("date_iso", { ascending: false })
      .limit(50);

    if (spendError) {
      console.error("spend_entries query error:", spendError);
    }

    console.log("AI userId:", userId);
    console.log("bills:", bills);
    console.log("debts:", debts);
    console.log("incomeEntries:", incomeEntries);

    // We do not yet have a true checking/unassigned cash table.
    // For now, estimate available cash from bill reserves the user has already saved.
    const availableCash =
      bills?.reduce((sum, b) => sum + Number(b.saved || 0), 0) ?? 0;

    const mappedBills = [
      ...(bills?.map((b) => ({
        name: b.name,
        amount:
          Number(
            b.min_payment ??
              b.monthly_target ??
              b.balance ??
              b.target ??
              0
          ) || 0,
        dueDate: b.due_date ?? undefined,
        kind: b.kind ?? b.category ?? undefined,
        essential: ["power", "utility", "insurance", "rent", "housing", "phone", "internet"].some(
          (word) => `${b.name || ""} ${b.category || ""}`.toLowerCase().includes(word)
        ),
      })) ?? []),

      ...(debts?.map((d) => ({
        name: d.name,
        amount:
          Number(d.min_payment ?? d.monthly_min_payment ?? d.balance ?? 0) || 0,
        dueDate: d.due_date ?? undefined,
        kind: d.kind ?? "debt",
        essential: false,
      })) ?? []),
    ];

    const mappedIncome =
      incomeEntries?.map((i) => ({
        name: i.source_name || "Income",
        amount: Number(i.amount || 0),
        expectedDate: i.date_iso ?? undefined,
      })) ?? [];

    const mappedBuckets =
      bills
        ?.filter((b) => b.focus || Number(b.saved || 0) > 0)
        .map((b) => ({
          name: b.name,
          saved: Number(b.saved || 0),
          focus: !!b.focus,
        })) ?? [];

    const recentPaymentsSummary =
      payments?.slice(0, 10).map((p) => `- ${p.merchant}: $${Number(p.amount || 0).toFixed(2)} on ${p.date_iso}`) ?? [];

    const recentSpendingSummary =
      spendEntries?.slice(0, 10).map((s) => `- ${s.merchant}: $${Number(s.amount || 0).toFixed(2)}${s.category ? ` (${s.category})` : ""} on ${s.date_iso}`) ?? [];

    const snapshot = buildFinancialSnapshot({
      availableCash,
      bills: mappedBills,
      expectedIncome: mappedIncome,
      buckets: mappedBuckets,
    });

    console.log("snapshot:", snapshot);

    const systemPrompt = getSystemPrompt(mode);

    const fullSystemPrompt = `
${systemPrompt}

This assistant is being used inside AskBen / Financial Triage.
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

Recent Payments:
${recentPaymentsSummary.length ? recentPaymentsSummary.join("\n") : "- No recent payments found."}

Recent Spending:
${recentSpendingSummary.length ? recentSpendingSummary.join("\n") : "- No recent spending found."}

Instructions:
- Use the snapshot as source of truth.
- Do not invent numbers.
- Bills table includes regular bills and saved bucket-like amounts.
- Debts table includes credit cards and loans.
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
        availableCash,
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
