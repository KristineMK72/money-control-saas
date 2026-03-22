import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type FinanceActionRequest =
  | {
      action: "add_payment";
      accessToken: string;
      payload: {
        merchant: string;
        amount: number;
        date_iso?: string;
        debt_name?: string;
        debt_id?: string;
        note?: string;
      };
    }
  | {
      action: "add_bill";
      accessToken: string;
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
    }
  | {
      action: "delete_payment";
      accessToken: string;
      payload: {
        payment_id?: string;
        merchant?: string;
        amount?: number;
        date_iso?: string;
      };
    }
  | {
      action: "delete_bill";
      accessToken: string;
      payload: {
        bill_id?: string;
        name?: string;
      };
    }
  | {
      action: "add_debt";
      accessToken: string;
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
    }
  | {
      action: "delete_debt";
      accessToken: string;
      payload: {
        debt_id?: string;
        name?: string;
      };
    };

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function getAuthenticatedUser(accessToken: string) {
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return data.user;
}

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveDebtId(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  payload: { debt_id?: string; debt_name?: string }
) {
  if (payload.debt_id) {
    const { data, error } = await admin
      .from("debts")
      .select("id, name")
      .eq("id", payload.debt_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Debt not found for this user.");
    return data.id;
  }

  if (payload.debt_name?.trim()) {
    const search = payload.debt_name.trim();

    const { data, error } = await admin
      .from("debts")
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", `%${search}%`)
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(`Could not find debt named "${payload.debt_name}".`);
    }

    if (data.length > 1) {
      throw new Error(
        `Multiple debts matched "${payload.debt_name}". Please be more specific.`
      );
    }

    return data[0].id;
  }

  return null;
}

async function handleAddPayment(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  payload: {
    merchant: string;
    amount: number;
    date_iso?: string;
    debt_name?: string;
    debt_id?: string;
    note?: string;
  }
) {
  if (!payload.merchant?.trim()) {
    throw new Error("merchant is required");
  }

  const amount = asNumber(payload.amount);
  if (amount <= 0) {
    throw new Error("amount must be greater than 0");
  }

  let debtId: string | null = null;

  if (payload.debt_id || payload.debt_name) {
    debtId = await resolveDebtId(admin, userId, {
      debt_id: payload.debt_id,
      debt_name: payload.debt_name,
    });
  }

  const insertPayload = {
    user_id: userId,
    merchant: payload.merchant.trim(),
    amount,
    date_iso: payload.date_iso?.trim() || todayIso(),
    debt_id: debtId,
    note: payload.note?.trim() || null,
  };

  const { data, error } = await admin
    .from("payments")
    .insert(insertPayload)
    .select("id, merchant, amount, date_iso, debt_id, note")
    .single();

  if (error) throw error;

  return {
    ok: true,
    action: "add_payment",
    record: data,
  };
}

async function handleAddBill(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
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
  }
) {
  if (!payload.name?.trim()) {
    throw new Error("name is required");
  }

  const amount = asNumber(payload.amount);
  if (amount <= 0) {
    throw new Error("amount must be greater than 0");
  }

  const insertPayload = {
    user_id: userId,
    name: payload.name.trim(),
    kind: payload.kind?.trim() || "bill",
    category: payload.category?.trim() || null,
    target: amount,
    balance: amount,
    min_payment: amount,
    saved: 0,
    due_date: payload.due_date?.trim() || null,
    due_day:
      typeof payload.due_day === "number" &&
      payload.due_day >= 1 &&
      payload.due_day <= 31
        ? payload.due_day
        : null,
    is_monthly: !!payload.is_monthly,
    monthly_target: !!payload.is_monthly ? amount : null,
    priority:
      typeof payload.priority === "number" ? payload.priority : null,
    focus: !!payload.focus,
    due: payload.note?.trim() || null,
  };

  const { data, error } = await admin
    .from("bills")
    .insert(insertPayload)
    .select(
      "id, name, kind, category, target, balance, min_payment, due_date, due_day, is_monthly, priority, focus"
    )
    .single();

  if (error) throw error;

  return {
    ok: true,
    action: "add_bill",
    record: data,
  };
}

async function handleDeletePayment(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  payload: {
    payment_id?: string;
    merchant?: string;
    amount?: number;
    date_iso?: string;
  }
) {
  if (payload.payment_id) {
    const { data, error } = await admin
      .from("payments")
      .delete()
      .eq("id", payload.payment_id)
      .eq("user_id", userId)
      .select("id, merchant, amount, date_iso")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Payment not found or already deleted.");

    return {
      ok: true,
      action: "delete_payment",
      record: data,
    };
  }

  if (!payload.merchant || typeof payload.amount !== "number") {
    throw new Error(
      "delete_payment requires payment_id or merchant + amount."
    );
  }

  let query = admin
    .from("payments")
    .delete()
    .eq("user_id", userId)
    .eq("merchant", payload.merchant)
    .eq("amount", payload.amount);

  if (payload.date_iso) {
    query = query.eq("date_iso", payload.date_iso);
  }

  const { data, error } = await query
    .select("id, merchant, amount, date_iso")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Payment not found or already deleted.");

  return {
    ok: true,
    action: "delete_payment",
    record: data,
  };
}

async function handleDeleteBill(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  payload: {
    bill_id?: string;
    name?: string;
  }
) {
  if (payload.bill_id) {
    const { data, error } = await admin
      .from("bills")
      .delete()
      .eq("id", payload.bill_id)
      .eq("user_id", userId)
      .select("id, name")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Bill not found or already deleted.");

    return {
      ok: true,
      action: "delete_bill",
      record: data,
    };
  }

  if (!payload.name?.trim()) {
    throw new Error("delete_bill requires bill_id or name.");
  }

  const { data, error } = await admin
    .from("bills")
    .delete()
    .eq("user_id", userId)
    .ilike("name", payload.name.trim())
    .select("id, name")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Bill not found or already deleted.");

  return {
    ok: true,
    action: "delete_bill",
    record: data,
  };
}

async function handleAddDebt(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
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
  }
) {
  if (!payload.name?.trim()) {
    throw new Error("name is required");
  }

  const balance = asNumber(payload.balance);
  if (balance <= 0) {
    throw new Error("balance must be greater than 0");
  }

  const minPayment = asNumber(
    payload.monthly_min_payment ?? payload.min_payment ?? 0
  );

  const insertPayload = {
    user_id: userId,
    name: payload.name.trim(),
    kind: payload.kind?.trim() || "credit",
    balance,
    min_payment: minPayment || null,
    due_date: payload.due_date?.trim() || null,
    is_monthly: !!payload.is_monthly,
    due_day:
      typeof payload.due_day === "number" &&
      payload.due_day >= 1 &&
      payload.due_day <= 31
        ? payload.due_day
        : null,
    monthly_min_payment: minPayment || null,
    note: payload.note?.trim() || null,
  };

  const { data, error } = await admin
    .from("debts")
    .insert(insertPayload)
    .select(
      "id, name, kind, balance, min_payment, due_date, is_monthly, due_day, monthly_min_payment, note"
    )
    .single();

  if (error) throw error;

  return {
    ok: true,
    action: "add_debt",
    record: data,
  };
}

async function handleDeleteDebt(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  payload: {
    debt_id?: string;
    name?: string;
  }
) {
  if (payload.debt_id) {
    const { data, error } = await admin
      .from("debts")
      .delete()
      .eq("id", payload.debt_id)
      .eq("user_id", userId)
      .select("id, name")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Debt not found or already deleted.");

    return {
      ok: true,
      action: "delete_debt",
      record: data,
    };
  }

  if (!payload.name?.trim()) {
    throw new Error("delete_debt requires debt_id or name.");
  }

  const { data, error } = await admin
    .from("debts")
    .delete()
    .eq("user_id", userId)
    .ilike("name", payload.name.trim())
    .select("id, name")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Debt not found or already deleted.");

  return {
    ok: true,
    action: "delete_debt",
    record: data,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FinanceActionRequest;

    if (!body?.accessToken) {
      return NextResponse.json(
        { error: "Missing accessToken." },
        { status: 401 }
      );
    }

    const user = await getAuthenticatedUser(body.accessToken);
    const admin = getAdminClient();

    switch (body.action) {
      case "add_payment": {
        const result = await handleAddPayment(admin, user.id, body.payload);
        return NextResponse.json(result);
      }

      case "add_bill": {
        const result = await handleAddBill(admin, user.id, body.payload);
        return NextResponse.json(result);
      }

      case "delete_payment": {
        const result = await handleDeletePayment(admin, user.id, body.payload);
        return NextResponse.json(result);
      }

      case "delete_bill": {
        const result = await handleDeleteBill(admin, user.id, body.payload);
        return NextResponse.json(result);
      }

      case "add_debt": {
        const result = await handleAddDebt(admin, user.id, body.payload);
        return NextResponse.json(result);
      }

      case "delete_debt": {
        const result = await handleDeleteDebt(admin, user.id, body.payload);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "Unsupported action." },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("finance-action route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run finance action.",
      },
      { status: 500 }
    );
  }
}
