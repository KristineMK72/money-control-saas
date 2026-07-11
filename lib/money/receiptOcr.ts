import { createWorker } from "tesseract.js";

export async function ocrImageFile(
  file: File
): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker("eng");

  try {
    const { data } = await worker.recognize(file);

    return {
      text: (data.text || "").trim(),
      confidence:
        typeof data.confidence === "number"
          ? Math.max(0, Math.min(1, data.confidence / 100))
          : 0,
    };
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
    .map((line) => line.trim())
    .filter(Boolean);

  const monthMap: Record<string, string> = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };

  let currentYear = new Date().getFullYear();

  function parseDateISO(line: string): string | undefined {
    const yearOnly = line.match(/\b(20\d{2})\b/);
    if (yearOnly) currentYear = Number(yearOnly[1]);

    const monthDate = line.match(
      /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:,\s*(20\d{2}))?\b/i
    );

    if (monthDate) {
      const month = monthMap[monthDate[1].toLowerCase()];
      const day = String(Number(monthDate[2])).padStart(2, "0");
      const year = monthDate[3] ? Number(monthDate[3]) : currentYear;
      return `${year}-${month}-${day}`;
    }

    const slashDate = line.match(
      /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/
    );

    if (slashDate) {
      const month = String(Number(slashDate[1])).padStart(2, "0");
      const day = String(Number(slashDate[2])).padStart(2, "0");
      const year = slashDate[3]
        ? slashDate[3].length === 2
          ? `20${slashDate[3]}`
          : slashDate[3]
        : String(currentYear);

      return `${year}-${month}-${day}`;
    }

    return undefined;
  }

  function isNoise(line: string): boolean {
    const lower = line.toLowerCase();

    return (
      lower === "all" ||
      lower === "money in" ||
      lower === "money out" ||
      lower.includes("bank account") ||
      lower.includes("recent transactions") ||
      lower.includes("view all") ||
      lower.includes("available balance") ||
      lower.includes("current balance") ||
      lower.includes("activate now") ||
      lower.includes("settings") ||
      /\bpts\b/i.test(line)
    );
  }

  function parseAmount(line: string): {
    amount: number;
    direction: "debit" | "credit";
  } | null {
    const match = line.match(
      /([+\-])?\s*\$?\s*(\d{1,3}(?:[,\s]\d{3})*|\d+)\.(\d{2})/
    );

    if (!match) return null;

    const sign = match[1] || "";
    const dollars = match[2].replace(/[,\s]/g, "");
    const cents = match[3];
    const amount = Number(`${dollars}.${cents}`);

    if (!Number.isFinite(amount) || amount <= 0) return null;

    let direction: "debit" | "credit" = sign === "+" ? "credit" : "debit";

    const lower = line.toLowerCase();
    if (
      lower.includes("deposit") ||
      lower.includes("credit") ||
      lower.includes("money in") ||
      lower.includes("refund") ||
      lower.includes("payroll")
    ) {
      direction = "credit";
    }

    return { amount, direction };
  }

  function cleanMerchant(line: string): string {
    return line
      .replace(/([+\-])?\s*\$?\s*(\d{1,3}(?:[,\s]\d{3})*|\d+)\.\d{2}/g, "")
      .replace(/\b(pending|posted|completed|deposit|transfer|payment)\b/gi, "")
      .trim();
  }

  function looksLikeMerchant(line: string): boolean {
    if (!/[A-Za-z]/.test(line)) return false;
    if (isNoise(line)) return false;
    if (parseDateISO(line)) return false;
    if (parseAmount(line)) return false;
    return true;
  }

  const results: ParsedTxn[] = [];
  let currentDate: string | undefined;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    const dateFound = parseDateISO(line);
    if (dateFound) {
      currentDate = dateFound;
      continue;
    }

    const amountInfo = parseAmount(line);
    if (!amountInfo) continue;

    let merchant = cleanMerchant(line);
    let pending = line.toLowerCase().includes("pending");

    if (!merchant || merchant.length < 3) {
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const candidate = rawLines[j];

        if (candidate.toLowerCase().includes("pending")) {
          pending = true;
          continue;
        }

        if (looksLikeMerchant(candidate)) {
          merchant = cleanMerchant(candidate);
          break;
        }
      }
    }

    if (!merchant) merchant = "Transaction";

    const duplicate = results.some(
      (row) =>
        row.merchant === merchant &&
        row.amount === amountInfo.amount &&
        row.direction === amountInfo.direction &&
        row.dateText === currentDate
    );

    if (!duplicate) {
      results.push({
        merchant,
        amount: amountInfo.amount,
        direction: amountInfo.direction,
        dateText: currentDate,
        pending,
      });
    }
  }

  return results;
}

export function guessCategoryFromMerchant(
  merchant: string
):
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

  if (m.includes("ulta") || m.includes("sephora") || m.includes("salon")) {
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
    .map((line) => line.trim())
    .filter(Boolean);

  function findMoneyAfterKeywords(keywords: string[]): number | undefined {
    for (const line of lines) {
      const lower = line.toLowerCase();

      if (!keywords.some((keyword) => lower.includes(keyword))) continue;

      const match = line.match(/\$?\s*(\d{1,4}(?:[,\s]\d{3})*(?:\.\d{2}))/);

      if (match) {
        const value = Number(match[1].replace(/\s/g, "").replace(/,/g, ""));
        if (Number.isFinite(value)) return value;
      }
    }

    return undefined;
  }

  function findPercent(): number | undefined {
    for (const line of lines) {
      const match = line.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%/);

      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) return value;
      }
    }

    return undefined;
  }

  function findDateISO(): string | undefined {
    for (const line of lines) {
      const iso = line.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);

      if (iso) {
        return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(
          2,
          "0"
        )}`;
      }

      const us = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})\b/);

      if (us) {
        const month = us[1].padStart(2, "0");
        const day = us[2].padStart(2, "0");
        const year = us[3].length === 2 ? `20${us[3]}` : us[3];

        return `${year}-${month}-${day}`;
      }
    }

    return undefined;
  }

  const name =
    lines.find((line) => /[A-Za-z]/.test(line) && line.length >= 3 && line.length <= 40) ||
    undefined;

  return {
    name,
    balance: findMoneyAfterKeywords([
      "balance",
      "current balance",
      "statement balance",
      "outstanding balance",
    ]),
    minPayment: findMoneyAfterKeywords([
      "minimum payment",
      "min payment",
      "payment due",
      "minimum due",
    ]),
    creditLimit: findMoneyAfterKeywords(["credit limit", "limit"]),
    apr: findPercent(),
    dueDate: findDateISO(),
  };
}
