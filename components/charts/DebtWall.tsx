"use client";

/**
 * DebtWall — colonial bar chart of obligations (D3 scales + React SVG).
 *
 * Each bar is a "stone" in the wall. When debtChange is negative (paid down),
 * the newest stones crack / shrink and the wall looks weaker — visual payoff
 * for progress. Overdue amounts render in a sterner red-stone tone.
 *
 * Usage:
 *   <DebtWall segments={[
 *     { label: "Card", amount: 1200 },
 *     { label: "Loan", amount: 2800, overdue: true },
 *   ]} debtChange={-150} />
 */

import { useMemo, useId } from "react";
import * as d3 from "d3";

export interface DebtSegment {
  label: string;
  amount: number;
  overdue?: boolean;
}

export interface DebtWallProps {
  segments: DebtSegment[];
  /** Negative = paid down this period (celebration cue) */
  debtChange?: number;
  width?: number;
  height?: number;
  className?: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DebtWall({
  segments,
  debtChange,
  width = 360,
  height = 200,
  className = "",
}: DebtWallProps) {
  const uid = useId().replace(/:/g, "");
  const margin = { top: 12, right: 12, bottom: 36, left: 12 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const paidDown = debtChange !== undefined && debtChange < 0;

  const layout = useMemo(() => {
    const max = d3.max(segments, (d) => d.amount) ?? 1;
    const x = d3
      .scaleBand<string>()
      .domain(segments.map((d) => d.label))
      .range([0, innerW])
      .padding(0.3);

    const y = d3.scaleLinear().domain([0, max]).nice().range([innerH, 0]);

    const bars = segments.map((d) => {
      const bw = x.bandwidth();
      const bh = innerH - y(d.amount);
      return {
        ...d,
        x: x(d.label) ?? 0,
        y: y(d.amount),
        w: bw,
        h: bh,
      };
    });

    return { x, y, bars, max };
  }, [segments, innerW, innerH]);

  const total = segments.reduce((s, d) => s + d.amount, 0);

  return (
    <div className={`flex flex-col ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Debt wall totaling ${formatCurrency(total)}`}
        className="select-none"
      >
        <defs>
          <linearGradient id={`stone-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#57534e" />
            <stop offset="100%" stopColor="#292524" />
          </linearGradient>
          <linearGradient id={`overdue-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
          <linearGradient id={`cracked-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#44403c" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Ground line */}
          <line
            x1={0}
            x2={innerW}
            y1={innerH}
            y2={innerH}
            stroke="#44403c"
            strokeWidth={2}
          />

          {layout.bars.map((b) => (
            <g key={b.label}>
              {/* Stone block */}
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={3}
                fill={
                  b.overdue
                    ? `url(#overdue-${uid})`
                    : paidDown
                      ? `url(#cracked-${uid})`
                      : `url(#stone-${uid})`
                }
                stroke={b.overdue ? "#7f1d1d" : "#1c1917"}
                strokeWidth={1}
              />
              {/* Mortar lines (horizontal cracks) for texture */}
              {b.h > 24 && (
                <>
                  <line
                    x1={b.x + 4}
                    x2={b.x + b.w - 4}
                    y1={b.y + b.h * 0.35}
                    y2={b.y + b.h * 0.35}
                    stroke="#1c1917"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                  <line
                    x1={b.x + 4}
                    x2={b.x + b.w - 4}
                    y1={b.y + b.h * 0.7}
                    y2={b.y + b.h * 0.7}
                    stroke="#1c1917"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                </>
              )}
              {/* Amount on stone if tall enough */}
              {b.h > 28 && (
                <text
                  x={b.x + b.w / 2}
                  y={b.y + 14}
                  textAnchor="middle"
                  fill="#e7e5e4"
                  fontFamily="serif"
                  fontSize={10}
                  fontWeight={600}
                >
                  {formatCurrency(b.amount)}
                </text>
              )}
              {/* Label */}
              <text
                x={b.x + b.w / 2}
                y={innerH + 16}
                textAnchor="middle"
                fill="#a8a29e"
                fontFamily="serif"
                fontSize={11}
              >
                {b.label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <div className="mt-1 flex items-center justify-between px-1 font-serif text-xs text-stone-400">
        <span>Total: {formatCurrency(total)}</span>
        {paidDown && (
          <span className="text-emerald-500/90">
            −{formatCurrency(Math.abs(debtChange!))} this period
          </span>
        )}
        {debtChange !== undefined && debtChange > 0 && (
          <span className="text-red-400/90">
            +{formatCurrency(debtChange)} this period
          </span>
        )}
      </div>
    </div>
  );
}

export default DebtWall;
