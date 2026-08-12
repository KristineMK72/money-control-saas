export const ACCOUNT_EXPORT_TABLES = [
  "profiles",
  "bills",
  "debts",
  "income_sources",
  "income_entries",
  "spend_entries",
  "spend_needs",
  "payments",
  "side_hustles",
  "xp_events",
  "reputation_events",
  "product_events",
  "visitors",
  "ai_rate_counters",
] as const;

export type AccountExportTable = (typeof ACCOUNT_EXPORT_TABLES)[number];
