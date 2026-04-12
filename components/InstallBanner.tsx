"use client";

import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on iPhone Safari
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());

    const isStandalone =
      (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 90,
        left: 16,
        right: 16,
        background: "#111827",
        color: "#fff",
        padding: "16px",
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        zIndex: 9999,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
        📱 Add Ben to your Home Screen
      </div>

      <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 10 }}>
        Get daily “what to pay first” guidance instantly
      </div>

      <div style={{ fontSize: 13, opacity: 0.8 }}>
        Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
      </div>

      <button
        onClick={() => setShow(false)}
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          background: "transparent",
          border: "none",
          color: "#fff",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}
