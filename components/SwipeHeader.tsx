"use client";

import { useRef, useState, type ReactNode } from "react";

export default function SwipeHeader({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const touchStartY = useRef(0);

  return (
    <>
      <div
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          const endY = e.changedTouches[0].clientY;
          const diff = endY - touchStartY.current;

          if (diff < -40) setHidden(true);
          if (diff > 40) setHidden(false);
        }}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 260ms ease",
          background:
            "linear-gradient(180deg, rgba(5,5,8,0.78), rgba(5,5,8,0.32))",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
        }}
      >
        {children}
      </div>

      {hidden && (
        <button
          type="button"
          onClick={() => setHidden(false)}
          style={{
            position: "fixed",
            top: 10,
            right: 14,
            zIndex: 99999,
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 999,
            background: "rgba(5,5,8,0.82)",
            color: "#fff7ed",
            padding: "9px 13px",
            fontWeight: 900,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          ↓ Header
        </button>
      )}
    </>
  );
}
