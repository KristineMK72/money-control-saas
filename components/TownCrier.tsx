"use client";

/**
 * <TownCrier /> — the parchment drop when the app opens.
 */

import type { TownCrierAnnouncement } from "@/lib/ben";

export interface TownCrierProps {
  announcement: TownCrierAnnouncement;
  onAction?: (href: string) => void;
  onDismiss?: () => void;
  className?: string;
}

export function TownCrier({
  announcement,
  onAction,
  onDismiss,
  className = "",
}: TownCrierProps) {
  return (
    <div
      className={
        "relative max-w-lg overflow-hidden rounded-xl border-2 border-amber-700/60 " +
        "bg-gradient-to-b from-amber-100 via-amber-50 to-stone-100 text-stone-900 shadow-2xl " +
        className
      }
      role="alertdialog"
      aria-label="Town Crier announcement"
    >
      {/* Parchment texture hint */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <header className="relative border-b border-amber-800/20 bg-amber-900/10 px-6 py-4 text-center">
        <div className="mb-1 text-2xl" aria-hidden>🔔</div>
        <h2 className="font-serif text-xl font-bold tracking-wide text-amber-950">
          {announcement.title}
        </h2>
      </header>

      <div className="relative px-6 py-5">
        <p className="whitespace-pre-line font-serif text-base leading-relaxed text-stone-800">
          {announcement.body}
        </p>
      </div>

      {(announcement.actions?.length || announcement.dismissible) && (
        <footer className="relative flex flex-wrap gap-2 border-t border-amber-800/20 px-6 py-4">
          {announcement.actions?.map((action) => (
            <button
              key={action.href}
              type="button"
              onClick={() => onAction?.(action.href)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-800 active:scale-[0.98]"
            >
              {action.icon && <span aria-hidden>{action.icon}</span>}
              {action.label}
            </button>
          ))}
          {announcement.dismissible && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full rounded-lg border border-amber-800/30 px-4 py-2 text-sm font-medium text-amber-900/80 transition hover:bg-amber-200/40"
            >
              Dismiss
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

export default TownCrier;
