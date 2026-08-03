/**
 * Shared types for the Franklin / Ben character system.
 * Everything in Franklin's Landing that speaks through Ben uses these.
 */

export type BenMood =
  | "neutral"
  | "welcoming"
  | "proud"
  | "concerned"
  | "urgent"
  | "encouraging"
  | "celebratory"
  | "stern"
  | "wise";

export type BenLocation =
  | "TownSquare"
  | "Bank"
  | "PaymentHall"
  | "GovernorsOffice"
  | "Church"
  | "Harbor"
  | "Dashboard"
  | "Letter"
  | "TownCrier";

export type SpeechContext =
  | "greeting"
  | "billsDue"
  | "incomeSummary"
  | "debtUpdate"
  | "savingsMilestone"
  | "spendingPattern"
  | "questComplete"
  | "townEvent"
  | "letter"
  | "warning"
  | "celebration"
  | "general";

export interface FinancialSnapshot {
  /** Total income this period (e.g. month) */
  incomeThisMonth?: number;
  /** Remaining expected income */
  remainingIncome?: number;
  /** Number of bills due soon */
  billsDueCount?: number;
  /** Days until next bill */
  daysUntilNextBill?: number;
  /** Total debt */
  totalDebt?: number;
  /** Debt change since last period (negative = paid down) */
  debtChange?: number;
  /** Current savings */
  savings?: number;
  /** Savings goal progress 0–1 */
  savingsProgress?: number;
  /** Notable spending categories that rose */
  risingExpenses?: string[];
  /** Idle subscriptions count */
  idleSubscriptions?: number;
  /** Usual payday pattern, e.g. "Fridays" */
  usualPayday?: string;
  /** Any overdue amount */
  overdueAmount?: number;
}

export interface BenSpeechRequest {
  context: SpeechContext;
  mood?: BenMood;
  location?: BenLocation;
  data?: FinancialSnapshot;
  /** Optional free-form facts Ben can reference */
  facts?: string[];
  /** Force a particular tone override */
  forceColonial?: boolean;
}

export interface BenSpeech {
  /** The spoken / displayed line in character */
  text: string;
  mood: BenMood;
  location?: BenLocation;
  /** Optional short title for UI (e.g. "Hear ye!") */
  title?: string;
  /** Suggested animation or visual cue */
  animation?: "wave" | "nod" | "point" | "celebrate" | "stern" | "write";
}

export interface BenLetter {
  id: string;
  from: string;
  subject: string;
  body: string;
  /** When the letter should appear */
  urgency: "low" | "medium" | "high";
  /** Related financial data for the UI */
  related?: Partial<FinancialSnapshot>;
  sealed?: boolean;
}

export interface TownCrierAnnouncement {
  title: string;
  body: string;
  actions?: Array<{
    label: string;
    href: string;
    icon?: string;
  }>;
  dismissible?: boolean;
}
