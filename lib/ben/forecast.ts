// /lib/ben/forecast.ts

import { BenInput, BenOutput } from "./types";
import { BenEngine } from "./engine";

export interface ForecastInput {
  name: string | null;
  timeframeLabel: string;      // "This week", "This month", etc.
  totalNeeded: number;         // obligations for the period
  incomeSoFar: number;         // income already received
  daysElapsed: number;         // days passed in the period
  daysTotal: number;           // total days in the period
}

export interface ForecastResult {
  ben: BenOutput;
  incomeGap: number;
  dailyIncomeNeeded: number;
  projectedOnTrack: boolean;
}

export function getForecast(input: ForecastInput): ForecastResult {
  const { totalNeeded, incomeSoFar, daysElapsed, daysTotal } = input;

  const incomeGap = Math.max(0, totalNeeded - incomeSoFar);

  const daysRemaining = Math.max(0, daysTotal - daysElapsed || 0);

  const dailyIncomeNeeded =
    daysRemaining > 0 ? incomeGap / daysRemaining : incomeGap;

  const projectedOnTrack =
    totalNeeded === 0
      ? true
      : incomeSoFar >= (totalNeeded * daysElapsed) / Math.max(daysTotal, 1);

  const benInput: BenInput = {
    name: input.name,
    timeframeLabel: input.timeframeLabel,
    totalNeeded,
    incomeSoFar,
    incomeGap,
    dailyIncomeNeeded,
  };

  const ben = BenEngine.getForecastMessage(benInput);

  return {
    ben,
    incomeGap,
    dailyIncomeNeeded,
    projectedOnTrack,
  };
}
