"use client";

/**
 * useTriviaTriggers — surfaces colonial trivia at the right moments.
 *
 * Triggers:
 *  - app_open          → random welcome-flavored fact
 *  - bill_paid         → money / proverb
 *  - savings_milestone → franklin / proverb celebration
 *  - debt_reduced      → town / money
 *  - overdue           → stern proverb
 *  - idle_subs         → "small leak" proverb
 *  - timer             → gentle rotation while dashboard is open
 *
 * Usage:
 *   const { active, dismiss, fire } = useTriviaTriggers({ data: financialSnapshot });
 *
 *   // Auto: shows on app open + timer
 *   // Manual: fire("bill_paid") after a payment succeeds
 *
 *   {active && <TriviaPopup triviaId={active.id} open onClose={dismiss} />}
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLONIAL_TRIVIA,
  randomTrivia,
  type ColonialTrivia,
} from "@/lib/ben/trivia";
import type { FinancialSnapshot } from "@/lib/ben";

export type TriviaTrigger =
  | "app_open"
  | "bill_paid"
  | "savings_milestone"
  | "debt_reduced"
  | "overdue"
  | "idle_subs"
  | "timer";

const TRIGGER_CATEGORY: Record<
  TriviaTrigger,
  ColonialTrivia["category"] | ColonialTrivia["category"][] | null
> = {
  app_open: ["franklin", "town", "curious"],
  bill_paid: ["money", "proverb"],
  savings_milestone: ["franklin", "proverb"],
  debt_reduced: ["town", "money"],
  overdue: "proverb",
  idle_subs: "proverb",
  timer: null, // any
};

/** Prefer a specific id when it fits the moment */
const TRIGGER_PREFERRED_ID: Partial<Record<TriviaTrigger, string>> = {
  idle_subs: "proverb-leak",
  overdue: "proverb-excuses",
  savings_milestone: "franklin-penny",
  bill_paid: "proverb-diligence",
};

function pickForTrigger(trigger: TriviaTrigger): ColonialTrivia {
  const preferred = TRIGGER_PREFERRED_ID[trigger];
  if (preferred) {
    const hit = COLONIAL_TRIVIA.find((t) => t.id === preferred);
    if (hit) return hit;
  }

  const cat = TRIGGER_CATEGORY[trigger];
  if (Array.isArray(cat)) {
    const chosen = cat[Math.floor(Math.random() * cat.length)]!;
    return randomTrivia(chosen);
  }
  if (cat) return randomTrivia(cat);
  return randomTrivia();
}

export interface UseTriviaTriggersOptions {
  /** Financial snapshot — used to auto-fire contextual triggers once */
  data?: FinancialSnapshot;
  /** Show a fact shortly after mount */
  fireOnOpen?: boolean;
  /** Rotate a new fact on an interval while mounted (ms). 0 = off */
  timerMs?: number;
  /** Minimum gap between popups (ms) so we don't spam */
  cooldownMs?: number;
}

export function useTriviaTriggers(options: UseTriviaTriggersOptions = {}) {
  const {
    data,
    fireOnOpen = true,
    timerMs = 60000,
    cooldownMs = 20000,
  } = options;

  const [active, setActive] = useState<ColonialTrivia | null>(null);
  const lastShownAt = useRef(0);
  const firedContextual = useRef<Set<string>>(new Set());

  const canShow = useCallback(() => {
    return Date.now() - lastShownAt.current >= cooldownMs;
  }, [cooldownMs]);

  const fire = useCallback(
    (trigger: TriviaTrigger) => {
      if (!canShow() && trigger === "timer") return; // timer respects cooldown; manual can override
      const trivia = pickForTrigger(trigger);
      lastShownAt.current = Date.now();
      setActive(trivia);
      return trivia;
    },
    [canShow]
  );

  const dismiss = useCallback(() => {
    setActive(null);
  }, []);

  // App open
  useEffect(() => {
    if (!fireOnOpen) return;
    const t = setTimeout(() => fire("app_open"), 1200); // after parchment settles
    return () => clearTimeout(t);
  }, [fireOnOpen, fire]);

  // Contextual one-shots from financial data
  useEffect(() => {
    if (!data) return;

    const tryFire = (key: string, trigger: TriviaTrigger) => {
      if (firedContextual.current.has(key)) return;
      if (!canShow()) return;
      firedContextual.current.add(key);
      fire(trigger);
    };

    if (data.overdueAmount && data.overdueAmount > 0) {
      tryFire("overdue", "overdue");
    } else if (data.idleSubscriptions && data.idleSubscriptions > 0) {
      tryFire(`idle-${data.idleSubscriptions}`, "idle_subs");
    } else if (data.savingsProgress !== undefined && data.savingsProgress >= 1) {
      tryFire("savings-full", "savings_milestone");
    } else if (data.debtChange !== undefined && data.debtChange < 0) {
      tryFire(`debt-${data.debtChange}`, "debt_reduced");
    }
  }, [data, canShow, fire]);

  // Gentle timer rotation
  useEffect(() => {
    if (!timerMs || timerMs <= 0) return;
    const id = setInterval(() => {
      if (canShow()) fire("timer");
    }, timerMs);
    return () => clearInterval(id);
  }, [timerMs, canShow, fire]);

  return { active, dismiss, fire };
}

export default useTriviaTriggers;
