"use client";

import { useEffect } from "react";

export default function TrackVisitor() {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pathname: window.location.pathname,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, []);

  return null;
}
