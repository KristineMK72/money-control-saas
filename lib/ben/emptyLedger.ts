export const EMPTY_LEDGER_REPLY =
  "The ledger is empty, good friend. Add one bill or one debt — a name, an amount, a due date if you have it. Then ask again. I will rank that number and give you one next move. I will not invent balances.";

function countField(value: unknown, fallback: unknown) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
  return 0;
}

export function isEmptyLedgerSummary(summary: string | undefined | null) {
  const text = (summary ?? "").trim();
  if (!text) return true;
  if (/no financial/i.test(text)) return true;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const billCount = countField(parsed.bills, parsed.billCount);
    const debtCount = countField(parsed.debts, parsed.debtCount);
    return billCount + debtCount <= 0;
  } catch {
    return /0 bill/i.test(text) && /0 debt/i.test(text);
  }
}
