import type { SpendCategory } from "./types";

/**
 * FAST RULE-BASED CLASSIFIER (no AI cost, instant)
 * This is your first-pass “AskBen brain”
 */
export function guessCategoryFromMerchant(
  merchant: string
): SpendCategory {
  const m = merchant.toLowerCase();

  // ───── GROCERIES ─────
  if (
    m.includes("target") ||
    m.includes("walmart") ||
    m.includes("aldi") ||
    m.includes("kroger") ||
    m.includes("cub") ||
    m.includes("costco") ||
    m.includes("supermarket") ||
    m.includes("grocery")
  ) {
    return "groceries";
  }

  // ───── GAS ─────
  if (
    m.includes("shell") ||
    m.includes("bp") ||
    m.includes("exxon") ||
    m.includes("chevron") ||
    m.includes("speedway") ||
    m.includes("holiday") ||
    m.includes("gas")
  ) {
    return "gas";
  }

  // ───── EATING OUT ─────
  if (
    m.includes("mcdonald") ||
    m.includes("burger") ||
    m.includes("starbucks") ||
    m.includes("subway") ||
    m.includes("chipotle") ||
    m.includes("restaurant") ||
    m.includes("cafe") ||
    m.includes("pizza") ||
    m.includes("dunkin")
  ) {
    return "eating_out";
  }

  // ───── BILLS ─────
  if (
    m.includes("electric") ||
    m.includes("water") ||
    m.includes("internet") ||
    m.includes("verizon") ||
    m.includes("at&t") ||
    m.includes("xfinity") ||
    m.includes("insurance")
  ) {
    return "bills";
  }

  // ───── KIDS ─────
  if (
    m.includes("daycare") ||
    m.includes("school") ||
    m.includes("child") ||
    m.includes("toy") ||
    m.includes("babysit")
  ) {
    return "kids";
  }

  // ───── BUSINESS ─────
  if (
    m.includes("amazon web services") ||
    m.includes("aws") ||
    m.includes("stripe") ||
    m.includes("shopify") ||
    m.includes("domain") ||
    m.includes("hosting")
  ) {
    return "business";
  }

  // ───── SELF CARE ─────
  if (
    m.includes("gym") ||
    m.includes("salon") ||
    m.includes("spa") ||
    m.includes("massage") ||
    m.includes("therapy")
  ) {
    return "self_care";
  }

  // ───── SUBSCRIPTIONS ─────
  if (
    m.includes("netflix") ||
    m.includes("spotify") ||
    m.includes("hulu") ||
    m.includes("subscription") ||
    m.includes("apple.com")
  ) {
    return "subscriptions";
  }

  // ───── DEFAULT ─────
  return "misc";
}
