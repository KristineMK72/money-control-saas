// /lib/ben/types.ts

export type BenMood =
  | "encouraging"
  | "stern"
  | "urgent"
  | "witty"
  | "celebratory";

export interface BenInput {
  name: string | null;
  timeframeLabel: string;
  totalNeeded: number;
  incomeSoFar: number;
  incomeGap: number;
  dailyIncomeNeeded: number;
}

export interface BenOutput {
  text: string;
  mood: BenMood;
}
