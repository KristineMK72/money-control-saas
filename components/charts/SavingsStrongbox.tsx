"use client";

/**
 * SavingsStrongbox — colonial radial progress chart (D3 scales + React SVG).
 *
 * Visual: a iron-bound strongbox lid seen from above, filling with amber "coin"
 * arc as savingsProgress goes 0 → 1. At 100% the latch gleams and optional
 * celebration copy appears.
 *
 * Usage:
 *   <SavingsStrongbox progress={0.72} savings={890} goal={1200} />
 *   // or from FinancialSnapshot:
 *   <SavingsStrongbox progress={data.savingsProgress ?? 0} savings={data.savings} />
 */

import { useMemo, useId } from "react";
import * as d3 from "d3";

export interface SavingsStrongboxProps {
  /** 0–1 progress toward goal */
  progress: number;
  /** Current savings amount (for label) */
  savings?: number;
  /** Goal amount (for label). If omitted, only % is shown. */
  goal?: number;
  /** Pixel size of the SVG (square) */
  size?: number;
  /** Optional caption under the chart */
  caption?: string;
  className?: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SavingsStrongbox({
  progress,
  savings,
  goal,
  size = 220,
  caption,
  className = "",
}: SavingsStrongboxProps) {
  const uid = useId().replace(/:/g, "");
  const clamped = Math.max(0, Math.min(1, progress));
  const isComplete = clamped >= 1;

  const geometry = useMemo(() => {
    const stroke = 18;
    const radius = (size - stroke) / 2 - 8;
    const cx = size / 2;
    const cy = size / 2;

    // Full background track + progress arc (start at 12 o'clock, clockwise)
    const arcGen = d3
      .arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(radius - stroke / 2)
      .outerRadius(radius + stroke / 2)
      .cornerRadius(6);

    const full = 2 * Math.PI;
    // Start at top (-90°)
    const start = -Math.PI / 2;
    const end = start + full * clamped;

    const trackPath = arcGen({ startAngle: start, endAngle: start + full }) ?? "";
    const progressPath = arcGen({ startAngle: start, endAngle: end }) ?? "";

    // Decorative "iron bands" — three radial ticks at 25/50/75%
    const ticks = [0.25, 0.5, 0.75].map((t) => {
      const angle = start + full * t;
      const inner = radius - stroke / 2 - 4;
      const outer = radius + stroke / 2 + 4;
      return {
        x1: cx + Math.cos(angle) * inner,
        y1: cy + Math.sin(angle) * inner,
        x2: cx + Math.cos(angle) * outer,
        y2: cy + Math.sin(angle) * outer,
      };
    });

    return { cx, cy, radius, stroke, trackPath, progressPath, ticks };
  }, [size, clamped]);

  const label = useMemo(() => {
    if (savings !== undefined && goal !== undefined) {
      return `${formatCurrency(savings)} / ${formatCurrency(goal)}`;
    }
    if (savings !== undefined) return formatCurrency(savings);
    return `${Math.round(clamped * 100)}%`;
  }, [savings, goal, clamped]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Savings progress ${Math.round(clamped * 100)} percent`}
        className="select-none"
      >
        <defs>
          {/* Parchment-to-amber gradient for the fill */}
          <linearGradient id={`coin-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="55%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id={`iron-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#57534e" />
            <stop offset="100%" stopColor="#292524" />
          </linearGradient>
          {/* Soft glow when complete */}
          <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer iron ring (strongbox rim) */}
        <circle
          cx={geometry.cx}
          cy={geometry.cy}
          r={geometry.radius + geometry.stroke / 2 + 6}
          fill="none"
          stroke={`url(#iron-${uid})`}
          strokeWidth={3}
        />

        {/* Track (empty strongbox) */}
        <path d={geometry.trackPath} fill="#1c1917" stroke="#44403c" strokeWidth={1} />

        {/* Progress (coins filling) */}
        {clamped > 0 && (
          <path
            d={geometry.progressPath}
            fill={`url(#coin-${uid})`}
            filter={isComplete ? `url(#glow-${uid})` : undefined}
          />
        )}

        {/* Iron band ticks */}
        {geometry.ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#78716c"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}

        {/* Center disc (lid) */}
        <circle
          cx={geometry.cx}
          cy={geometry.cy}
          r={geometry.radius - geometry.stroke / 2 - 10}
          fill="#0c0a09"
          stroke="#44403c"
          strokeWidth={2}
        />

        {/* Latch / keyhole hint */}
        <circle
          cx={geometry.cx}
          cy={geometry.cy - 6}
          r={5}
          fill={isComplete ? "#fbbf24" : "#292524"}
          stroke={isComplete ? "#f59e0b" : "#57534e"}
          strokeWidth={1.5}
        />
        <rect
          x={geometry.cx - 2}
          y={geometry.cy - 2}
          width={4}
          height={10}
          rx={1}
          fill={isComplete ? "#fbbf24" : "#292524"}
        />

        {/* Center labels */}
        <text
          x={geometry.cx}
          y={geometry.cy + 28}
          textAnchor="middle"
          fill="#f5f5f4"
          fontFamily="serif"
          fontSize={22}
          fontWeight={700}
        >
          {Math.round(clamped * 100)}%
        </text>
        <text
          x={geometry.cx}
          y={geometry.cy + 46}
          textAnchor="middle"
          fill="#a8a29e"
          fontFamily="serif"
          fontSize={11}
        >
          {label}
        </text>
      </svg>

      {(caption || isComplete) && (
        <p className="mt-2 max-w-[240px] text-center font-serif text-sm text-stone-400">
          {isComplete
            ? caption ?? "Huzzah! The strongbox is full. Children may yet run through the square."
            : caption}
        </p>
      )}
    </div>
  );
}

export default SavingsStrongbox;
