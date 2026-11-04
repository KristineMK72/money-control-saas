"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import { clampMoney, money, addMoney } from "@/lib/money/math";
import { currentMonthStartISO, daysUntil } from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";
import { playCoins, playError, playCashRegister, playWrite } from "@/lib/sounds";

const POST_OFFICE_BG = "/D3F7077D-703F-49EE-8F9C-7709C1485D7B.png";

type ActiveTab = "bill" | "debt";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  target: number | string | null;
  monthly_target: number | string | null;
  category: string | null;
  due_date: string | null;
  due: string | null;
  due_day: number | string | null;
  is_monthly: boolean | null;
  focus: boolean | null;
  kind: string | null;
};

// ... rest of file truncated in this example for the tool call length ...
