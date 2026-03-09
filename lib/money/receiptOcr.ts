import { createWorker } from "tesseract.js";

export async function ocrImageFile(
  file: File
): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    const text = (data.text || "").trim();
    const confidence =
      typeof data.confidence === "number"
        ? Math.max(0, Math.min(1, data.confidence / 100))
        : 0;
    return { text, confidence };
  } finally {
    await worker.terminate();
  }
}

export type ParsedTxn = {
  merchant: string;
  amount: number;
  direction: "debit" | "credit";
  dateText?: string;
  pending?: boolean;
};

export function parseTransactionsScreenshot(text: string): ParsedTxn[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const lines = rawLines.filter((l) => {
    const lower = l.toLowerCase();
    if (lower === "recent transactions") return false;
    if (lower.startsWith("view all")) return false;
    if (/\bpts\b/i.test(l)) return false;
    if (lower.includes("activate now")) return false;
    return true;
  });

  const amountRegex = /([+\-])?\s*\$?\s*(\d{1,4}(?:[,\s]\d{3})*(?:\.\d{2}))/;

  function parseAmount(
    line: string
  ): { amount: number; direction: "debit" | "credit" } | null {
    const m = line.match(amountRegex);
    if (!m) return null;

    const sign = (m[1] || "").trim();
    const cleaned = (m[2] || "").replace(/\s/g, "").replace(/,/g, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return null;

    const direction: "debit" | "credit" = sign === "+" ? "credit" : "debit";
    return { amount: n, direction };
  }

  function looksLikeDateLine(line: string): boolean {
    return (
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i.test(line) ||
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(line) ||
      /\b20\d{2}\b/.test(line)
    );
  }

  function looksLikeMerchantLine(line: string): boolean {
    if (!/[A-Za-z]/.test(line)) return false;
    if (looksLikeDateLine(line)) return false;
    const lower = line.toLowerCase();
    if (lower === "pending") return false;
    if (lower === "posted") return false;
    return true;
  }

  const results: ParsedTxn[] = [];

  for (let i = 0; i < lines.length; i++) {
    const amt = parseAmount(lines[i]);
    if (!amt) continue;

    let merchant = "";
    let merchantIdx = -1;

    for (let j = i; j >= 0 && j >= i - 3; j--) {
      if (looksLikeMerchantLine(lines[j])) {
        merchant = lines[j];
        merchantIdx = j;
        break;
      }
    }
    if (!merchant) continue;

    let dateText: string | undefined = undefined;
    let pending = false;

    for (let j = merchantIdx + 1; j < lines.length && j <= merchantIdx + 3; j++) {
      if (looksLikeDateLine(lines[j])) {
        dateText = lines[j];
        break;
      }
      if (lines[j].toLowerCase().includes("pending")) pending = true;
    }

    if (lines[i].toLowerCase().includes("pending")) pending = true;

    const already = results.some(
      (r) =>
        r.merchant === merchant &&
        r.direction === amt.direction &&
        Math.abs(r.amount - amt.amount) < 0.0001 &&
        (r.dateText || "") === (dateText || "")
    );
    if (already) continue;

    results.push({
      merchant,
      amount: amt.amount,
      direction: amt.direction,
      dateText,
      pending,
    });
  }

  return results;
}

export function guessCategoryFromMerchant(merchant: string):
  | "groceries"
  | "gas"
  | "eating_out"
  | "kids"
  | "business"
  | "self_care"
  | "subscriptions"
  | "misc" {
  const m = merchant.toLowerCase();

  if (
    m.includes("mcdonald") ||
    m.includes("kfc") ||
    m.includes("taco") ||
    m.includes("pizza") ||
    m.includes("burger") ||
    m.includes("starbucks")
  ) {
    return "eating_out";
  }

  if (
    m.includes("speedway") ||
    m.includes("kwik") ||
    m.includes("shell") ||
    m.includes("bp") ||
    m.includes("holiday")
  ) {
    return "gas";
  }

  if (
    m.includes("target") ||
    m.includes("walmart") ||
    m.includes("aldi") ||
    m.includes("costco") ||
    m.includes("cub")
  ) {
    return "groceries";
  }

  if (
    m.includes("spotify") ||
    m.includes("netflix") ||
    m.includes("hulu") ||
    m.includes("apple.com/bill")
  ) {
    return "subscriptions";
  }

  if (
    m.includes("ulta") ||
    m.includes("sephora") ||
    m.includes("salon")
  ) {
    return "self_care";
  }

  return "misc";
}

export type ParsedDebt = {
  name?: string;
  balance?: number;
  minPayment?: number;
  dueDate?: string;
  apr?: number;
  creditLimit?: number;
};

export function parseDebtScreenshot(text: string): ParsedDebt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  function findMoneyAfterKeywords(keywords: string[]): number | undefined {
    for (const line of lines) {
      const lower = line.toLowerCase();
      const matched = keywords.some((k) => lower.includes(k));
      if (!matched) continue;

      const m = line.match(/\$?\s*(\d{1,4}(?:[,\s]\d{3})*(?:\.\d{2}))/);
      if (m) {
        const n = Number(m[1].replace(/\s/g, "").replace(/,/g, ""));
        if (Number.isFinite(n)) return n;
      }
    }
    return undefined;
  }

  function findPercent(): number | undefined {
    for (const line of lines) {
      const m = line.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%/);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n)) return n;
      }
    }
    return undefined;
  }

  function findDateISO(): string | undefined {
    for (const line of lines) {
      const iso = line.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
      if (iso) {
        return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
      }

      const us = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})\b/);
      if (us) {
        const mm = us[1].padStart(2, "0");
        const dd = us[2].padStart(2, "0");
        const yy = us[3].length === 2 ? `20${us[3]}` : us[3];
        return `${yy}-${mm}-${dd}`;
      }
    }
    return undefined;
  }

  const name =
    lines.find((l) => /[A-Za-z]/.test(l) && l.length >= 3 && l.length <= 40) ||
    undefined;

  const balance = findMoneyAfterKeywords([
    "balance",
    "current balance",
    "statement balance",
    "outstanding balance",
  ]);

  const minPayment = findMoneyAfterKeywords([
    "minimum payment",
    "min payment",
    "payment due",
    "minimum due",
  ]);

  const creditLimit = findMoneyAfterKeywords([
    "credit limit",
    "limit",
  ]);

  const apr = findPercent();
  const dueDate = findDateISO();

  return {
    name,
    balance,
    minPayment,
    dueDate,
    apr,
    creditLimit,
  };
}
