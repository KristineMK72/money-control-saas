/**
 * Client-side helper for product events (funnel + feature adoption).
 * Safe to call from any "use client" component.
 */
export function trackEvent(
  event_name: string,
  meta: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;

  const pathname = window.location.pathname;

  fetch("/api/track-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_name, pathname, meta }),
  }).catch(() => {
    // Fire-and-forget; never block UI
  });
}
