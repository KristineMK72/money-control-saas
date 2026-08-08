"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

  return null; // renders nothing
}
