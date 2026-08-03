"use client";

/**
 * TriviaPopup — small colonial parchment that surfaces a random (or chosen) fact.
 *
 * Drop anywhere; it can auto-pick from the trivia pool or accept a fixed item.
 *
 *   <TriviaPopup />                             // random on mount
 *   <TriviaPopup category="franklin" />
 *   <TriviaPopup triviaId="proverb-leak" />
 *   <TriviaPopup open={show} onClose={...} />    // controlled
 */

import { useEffect, useMemo, useState } from "react";
import {
  COLONIAL_TRIVIA,
  randomTrivia,
  type ColonialTrivia,
} from "@/lib/ben/trivia";

const CATEGORY_LABEL: Record<ColonialTrivia["category"], string> = {
  franklin: "Franklin",
  money: "Coin & Ledger",
  town: "Town Life",
  proverb: "Poor Richard",
  history: "History",
  curious: "Curious Fact",
};

export interface TriviaPopupProps {
  /** Filter random picks to one category */
  category?: ColonialTrivia["category"];
  /** Pin a specific trivia by id */
  triviaId?: string;
  /** Controlled open state */
  open?: boolean;
  onClose?: () => void;
  /** Auto-dismiss after ms (0 = no auto dismiss) */
  autoDismissMs?: number;
  /** Compact corner style vs centered card */
  variant?: "corner" | "card";
  className?: string;
}

export function TriviaPopup({
  category,
  triviaId,
  open: openProp,
  onClose,
  autoDismissMs = 0,
  variant = "corner",
  className = "",
}: TriviaPopupProps) {
  const [internalOpen, setInternalOpen] = useState(true);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const trivia = useMemo(() => {
    if (triviaId) {
      return COLONIAL_TRIVIA.find((t) => t.id === triviaId) ?? randomTrivia(category);
    }
    return randomTrivia(category);
  }, [triviaId, category]);

  useEffect(() => {
    if (!open || autoDismissMs <= 0) return;
    const t = setTimeout(() => {
      if (isControlled) onClose?.();
      else setInternalOpen(false);
    }, autoDismissMs);
    return () => clearTimeout(t);
  }, [open, autoDismissMs, isControlled, onClose]);

  if (!open) return null;

  const close = () => {
    if (isControlled) onClose?.();
    else setInternalOpen(false);
  };

  const shell =
    variant === "corner"
      ? "fixed bottom-4 right-4 z-50 max-w-xs animate-in fade-in slide-in-from-bottom-2"
      : "relative max-w-sm";

  return (
    <aside
      className={`${shell} ${className}`}
      role="complementary"
      aria-label="Colonial trivia"
    >
      <div className="overflow-hidden rounded-lg border-2 border-amber-800/50 bg-gradient-to-b from-amber-50 to-amber-100 text-stone-900 shadow-xl">
        <header className="flex items-center justify-between gap-2 border-b border-amber-800/20 bg-amber-900/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              📜
            </span>
            <span className="font-serif text-[10px] font-bold uppercase tracking-widest text-amber-900/80">
              {CATEGORY_LABEL[trivia.category]}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded px-1.5 py-0.5 text-xs text-amber-900/60 transition hover:bg-amber-200/60 hover:text-amber-950"
            aria-label="Dismiss trivia"
          >
            ✕
          </button>
        </header>

        <div className="px-3 py-3">
          <p className="font-serif text-sm leading-relaxed text-stone-800">
            {trivia.text}
          </p>
          {trivia.tag && (
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-amber-900/50">
              {trivia.tag}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * Hook: cycle random trivia on an interval (e.g. every 45s on the dashboard).
 */
export function useRotatingTrivia(
  intervalMs = 45000,
  category?: ColonialTrivia["category"]
) {
  const [trivia, setTrivia] = useState<ColonialTrivia>(() => randomTrivia(category));

  useEffect(() => {
    const id = setInterval(() => {
      setTrivia(randomTrivia(category));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, category]);

  return trivia;
}

export default TriviaPopup;
