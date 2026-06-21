import { daysUntil, nextDateFromDueDay } from "./dates";
import { clampMoney } from "./math";

export type PriorityKind = "bill" | "debt";

export type PriorityInput = {
  id: string;
  type: PriorityKind;
  name: string | null;
  amount?: number | string | null;
  balance?: number | string | null;
  due_date?: string | null;
  due?: string | null;
  due_day?: number | string | null;
  category?: string | null;
  kind?: string | null;
  apr?: number | string | null;
  focus?: boolean | null;
  is_paid_this_month?: boolean | null;
};

export type PriorityResult = {
  item: PriorityInput;
  score: number;
  resolvedDueDate: string | null;
  daysUntilDue: number | null;
  amount: number;
  reasons: string[];
};

export function resolveDueDate(item: PriorityInput): string | null {
  return item.due_date ?? item.due ?? nextDateFromDueDay(item.due_day);
}

export function priorityAmount(item: PriorityInput): number {
  return clampMoney(item.amount ?? item.balance ?? 0);
}

export function getPriorityReasons(item: PriorityInput): string[] {
  const reasons: string[] = [];
  const dueDate = resolveDueDate(item);
  const days = daysUntil(dueDate);
  const label = `${item.category ?? ""} ${item.kind ?? ""} ${
    item.name ?? ""
  }`.toLowerCase();

  if (item.is_paid_this_month) {
    reasons.push("Already paid this month");
    return reasons;
  }

  if (days !== null) {
    if (days < 0) reasons.push("Overdue");
    else if (days === 0) reasons.push("Due today");
    else if (days === 1) reasons.push("Due tomorrow");
    else if (days <= 3) reasons.push("Due within 3 days");
    else if (days <= 7) reasons.push("Due within 7 days");
    else if (days <= 14) reasons.push("Due within 14 days");
  } else {
    reasons.push("No due date found");
  }

  if (label.includes("rent") || label.includes("mortgage") || label.includes("housing")) {
    reasons.push("Housing priority");
  }

  if (
    label.includes("utility") ||
    label.includes("electric") ||
    label.includes("power") ||
    label.includes("heat") ||
    label.includes("gas")
  ) {
    reasons.push("Utility priority");
  }

  if (
    label.includes("car") ||
    label.includes("auto") ||
    label.includes("transport") ||
    label.includes("insurance")
  ) {
    reasons.push("Transportation/insurance priority");
  }

  if (label.includes("medical") || label.includes("health")) {
    reasons.push("Medical priority");
  }

  if (item.type === "debt") {
    reasons.push("Debt minimum/payment priority");
  }

  const apr = Number(item.apr ?? 0);
  if (Number.isFinite(apr) && apr >= 20) {
    reasons.push("High APR");
  }

  if (item.focus) {
    reasons.push("Marked as focus");
  }

  return reasons;
}

export function scorePriorityItem(item: PriorityInput): number {
  if (item.is_paid_this_month) return -1000;

  let score = 0;
  const dueDate = resolveDueDate(item);
  const days = daysUntil(dueDate);
  const label = `${item.category ?? ""} ${item.kind ?? ""} ${
    item.name ?? ""
  }`.toLowerCase();

  if (days !== null) {
    if (days < 0) score += 1000;
    else if (days === 0) score += 900;
    else if (days === 1) score += 800;
    else if (days <= 3) score += 700;
    else if (days <= 7) score += 500;
    else if (days <= 14) score += 250;
  }

  if (label.includes("rent") || label.includes("mortgage") || label.includes("housing")) {
    score += 300;
  }

  if (
    label.includes("utility") ||
    label.includes("electric") ||
    label.includes("power") ||
    label.includes("heat") ||
    label.includes("gas")
  ) {
    score += 250;
  }

  if (
    label.includes("car") ||
    label.includes("auto") ||
    label.includes("transport") ||
    label.includes("insurance")
  ) {
    score += 200;
  }

  if (label.includes("medical") || label.includes("health")) {
    score += 150;
  }

  if (item.type === "debt") {
    score += 75;
  }

  const apr = Number(item.apr ?? 0);
  if (Number.isFinite(apr) && apr >= 20) {
    score += 125;
  }

  if (item.focus) {
    score += 100;
  }

  return score;
}

export function prioritizeMoneyItems(items: PriorityInput[]): PriorityResult[] {
  return items
    .map((item) => {
      const resolvedDueDate = resolveDueDate(item);
      const daysUntilDue = daysUntil(resolvedDueDate);

      return {
        item,
        score: scorePriorityItem(item),
        resolvedDueDate,
        daysUntilDue,
        amount: priorityAmount(item),
        reasons: getPriorityReasons(item),
      };
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      const aDays = a.daysUntilDue ?? 9999;
      const bDays = b.daysUntilDue ?? 9999;
      if (aDays !== bDays) return aDays - bDays;

      const amountDiff = b.amount - a.amount;
      if (amountDiff !== 0) return amountDiff;

      return (a.item.name ?? "Unnamed").localeCompare(b.item.name ?? "Unnamed");
    });
}
