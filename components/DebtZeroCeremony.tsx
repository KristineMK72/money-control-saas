"use client";

import { useEffect, useRef } from "react";
import { playLevelUp } from "@/lib/sounds";

type Props = {
  debtName: string;
  amountPaid: number;
  onClose: () => void;
};

/* Gold + parchment confetti particles */
const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left:  `${Math.random() * 100}%`,
  delay: `${Math.random() * 1.8}s`,
  dur:   `${1.8 + Math.random() * 1.4}s`,
  size:  `${6 + Math.random() * 10}px`,
  color: ["#c9a84c","#e8c96a","#f5e6c8","#8b6914","#fff8e7","#c9a84c"][Math.floor(Math.random()*6)],
  rotate: `${Math.random() * 360}deg`,
}));

export default function DebtZeroCeremony({ debtName, amountPaid, onClose }: Props) {
  const hasPlayed = useRef(false);

  useEffect(() => {
    if (!hasPlayed.current) {
      hasPlayed.current = true;
      playLevelUp();
    }
  }, []);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(amountPaid);

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes ceremony-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes trophy-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          40%       { transform: translateY(-14px) scale(1.12); }
          70%       { transform: translateY(-6px) scale(1.05); }
        }
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 20px rgba(201,168,76,0.5), 0 0 40px rgba(201,168,76,0.3); }
          50%       { text-shadow: 0 0 40px rgba(201,168,76,0.9), 0 0 80px rgba(201,168,76,0.5); }
        }
        .ceremony-card { animation: ceremony-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .trophy-icon   { animation: trophy-bounce 1.6s ease-in-out infinite; }
        .glow-title    { animation: glow-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4"
           style={{ background: "rgba(5,2,0,0.92)", backdropFilter: "blur(6px)" }}>

        {/* Confetti */}
        {PARTICLES.map(p => (
          <div key={p.id}
               style={{
                 position: "fixed",
                 left: p.left, top: "-20px",
                 width: p.size, height: p.size,
                 background: p.color,
                 borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                 transform: `rotate(${p.rotate})`,
                 animation: `confetti-fall ${p.dur} ${p.delay} ease-in forwards`,
                 pointerEvents: "none",
                 zIndex: 100000,
               }} />
        ))}

        {/* Card */}
        <div className="ceremony-card w-full max-w-md text-center"
             style={{
               background:     "rgba(15,8,4,0.97)",
               border:         "1px solid rgba(201,168,76,0.7)",
               borderRadius:   "1rem",
               padding:        "2.5rem 2rem",
               boxShadow:      "0 0 80px rgba(201,168,76,0.2), 0 30px 60px rgba(0,0,0,0.9)",
               fontFamily:     "EB Garamond, serif",
             }}>

          {/* Top rule */}
          <div className="h-px mb-5"
               style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />

          {/* Trophy */}
          <div className="trophy-icon text-7xl mb-4">🏆</div>

          {/* Headline */}
          <p className="text-xs uppercase tracking-[0.3em] font-cinzel font-bold mb-2"
             style={{ color: "#6b4423" }}>
            Colonial Treasury — Victory Proclamation
          </p>

          <h1 className="glow-title font-cinzel text-4xl font-bold leading-tight"
              style={{ color: "#c9a84c" }}>
            Debt Defeated!
          </h1>

          {/* Debt name */}
          <div className="mt-4 rounded-xl px-5 py-3"
               style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.4)" }}>
            <p className="font-cinzel text-xl font-bold" style={{ color: "#e8d5b7" }}>
              {debtName}
            </p>
            <p className="text-sm mt-0.5 italic" style={{ color: "#9a7d5a" }}>
              has been struck from the ledger
            </p>
          </div>

          {/* Amount & XP */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3"
                 style={{ background: "rgba(74,138,66,0.1)", border: "1px solid rgba(74,138,66,0.3)" }}>
              <p className="text-[10px] uppercase tracking-widest font-cinzel" style={{ color: "#9a7d5a" }}>
                Final Payment
              </p>
              <p className="font-cinzel text-xl font-bold mt-0.5" style={{ color: "#4ade80" }}>
                {formatted}
              </p>
            </div>
            <div className="rounded-xl p-3"
                 style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}>
              <p className="text-[10px] uppercase tracking-widest font-cinzel" style={{ color: "#9a7d5a" }}>
                XP Earned
              </p>
              <p className="font-cinzel text-xl font-bold mt-0.5" style={{ color: "#c9a84c" }}>
                +500 XP
              </p>
            </div>
          </div>

          {/* Ben quote */}
          <div className="mt-5 flex items-start gap-2 text-left rounded-xl px-4 py-3"
               style={{ background: "rgba(245,230,200,0.05)", border: "1px solid rgba(107,68,35,0.3)" }}>
            <span className="text-xl shrink-0 mt-0.5">🪶</span>
            <p className="text-sm italic leading-relaxed" style={{ color: "#9a7d5a" }}>
              &ldquo;He that is good for making excuses is seldom good for anything else — but thou art the exception. Well done, Governor.&rdquo;
            </p>
          </div>

          {/* CTA */}
          <button onClick={onClose}
                  className="mt-6 w-full rounded-xl py-3.5 font-cinzel text-sm font-bold uppercase tracking-widest transition hover:opacity-90"
                  style={{ background: "#c9a84c", color: "#1a0f0a" }}>
            ✦ Claim Victory &amp; Return to Ledger
          </button>

          {/* Bottom rule */}
          <div className="h-px mt-5"
               style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
        </div>
      </div>
    </>
  );
}
