"use client";

/**
 * <BenLetter /> — colonial envelope / letter from Benjamin Franklin.
 */

import type { BenLetter as BenLetterType } from "@/lib/ben";

export interface BenLetterProps {
  letter: BenLetterType;
  onOpen?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function BenLetter({ letter, onOpen, onDismiss, className = "" }: BenLetterProps) {
  return (
    <article
      className={
        "relative max-w-md overflow-hidden rounded-lg border-2 border-amber-800/50 " +
        "bg-gradient-to-b from-amber-50 to-amber-100 text-stone-900 shadow-xl " +
        className
      }
    >
      {/* Wax seal hint */}
      {letter.sealed && (
        <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-800 text-xs font-bold text-amber-50 shadow-md ring-2 ring-red-900/50">
          BF
        </div>
      )}

      <header className="border-b border-amber-800/20 bg-amber-900/10 px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-900/70">
          From the Office of
        </p>
        <h2 className="font-serif text-lg font-bold text-amber-950">{letter.from}</h2>
        <p className="mt-1 text-sm italic text-stone-600">{letter.subject}</p>
      </header>

      <div className="px-5 py-4">
        <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-800">
          {letter.body}
        </pre>
      </div>

      <footer className="flex gap-2 border-t border-amber-800/20 px-5 py-3">
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-md bg-amber-900 px-3 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-800"
          >
            Attend to this
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-amber-800/40 px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-200/50"
          >
            Set aside
          </button>
        )}
      </footer>
    </article>
  );
}

export default BenLetter;
