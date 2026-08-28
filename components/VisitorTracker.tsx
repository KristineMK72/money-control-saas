"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import OnboardingTour from "@/components/OnboardingTour";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/whyben",
  "/forgot-password",
  "/reset-password",
]);

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip tracking admin pages
    if (pathname?.startsWith("/admin")) return;

    const payload = {
      pathname: pathname || "/",
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    };

    // Fire-and-forget — never break the page
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  const showTour = Boolean(pathname) && !PUBLIC_PATHS.has(pathname) && !pathname.startsWith("/onboarding");

  return showTour ? <OnboardingTour /> : null;
}
