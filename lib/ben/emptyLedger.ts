export const EMPTY_LEDGER_REPLY =
  "The ledger is empty, good friend. Add one bill or one debt — a name, an amount, a due date if you have it. Then ask again. I will rank that number and give you one next move. I will not invent balances.";

export function isEmptyLedgerSummary(summary: string | undefined | null) {
  const text = (summary ?? "").trim();
  if (!text) return true;
  if (/no financial/i.test(text)) return true;
  try {
    const parsed = JSON.parse(text) as {
      bills?: unknown;
      debts?: unknown;
      billCount?: number;
      debtCount?: number;
    };
    const billCount = Array.isArray(parsed.bills)
      ? parsed.bills.length
      : Number(parsed.billCount ?? 0);
    const debtCount = Array.isArray(parsed.debts)
      ? parsed.debts.length
      : Number(parsed.debtCount ?? 0);
    return billCount + debtCount <= 0;
  } catch {
    return /0 bill/i.test(text) && /0 debt/i.test(text);
  }
}
