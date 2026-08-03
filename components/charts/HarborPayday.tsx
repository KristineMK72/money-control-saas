"use client";

/**
 * HarborPayday — timeline of income events with a ship that sails in on payday.
 *
 * D3 scales for positions; React owns the SVG. When the most recent point is a
 * payday, the ship sits at the harbor mouth with a small wake.
 *
 * Usage:
 *   <HarborPayday
 *     events={[
 *       { date: "2026-07-01", label: "Jul 1", amount: 0, type: "quiet" },
 *       { date: "2026-07-11", label: "Jul 11", amount: 1847, type: "payday" },
 *       { date: "2026-07-25", label: "Jul 25", amount: 0, type: "expected" },
 *     ]}
 *   />
 */

import { useMemo, useId } from "react";
import * as d3 from "d3";

export type HarborEventType = "payday" | "expected" | "quiet" | "bill";

export interface HarborEvent {
  date: string;
  label: string;
  amount?: number;
  type: HarborEventType;
}

export interface HarborPaydayProps {
  events: HarborEvent[];
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

const TYPE_COLOR: Record<HarborEventType, string> = {
  payday: "#b45309",
  expected: "#a8a29e",
  quiet: "#44403c",
  bill: "#991b1b",
};

export function HarborPayday({
  events,
  width = 420,
  height = 160,
  className = "",
}: HarborPaydayProps) {
  const uid = useId().replace(/:/g, "");
  const margin = { top: 28, right: 24, bottom: 36, left: 24 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const layout = useMemo(() => {
    const x = d3
      .scalePoint<string>()
      .domain(events.map((e) => e.date))
      .range([0, innerW])
      .padding(0.15);

    const points = events.map((e) => ({
      ...e,
      cx: x(e.date) ?? 0,
      cy: innerH * 0.55,
    }));

    const latestPayday = [...points].reverse().find((p) => p.type === "payday");

    return { x, points, latestPayday };
  }, [events, innerW, innerH]);

  return (
    <div className={`flex flex-col ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Harbor payday timeline"
        className="select-none"
      >
        <defs>
          <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c4a6e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0c1929" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id={`dock-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#57534e" />
            <stop offset="100%" stopColor="#292524" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Water band */}
          <rect
            x={-8}
            y={innerH * 0.35}
            width={innerW + 16}
            height={innerH * 0.5}
            rx={8}
            fill={`url(#water-${uid})`}
          />

          {/* Horizon / dock line */}
          <line
            x1={0}
            x2={innerW}
            y1={innerH * 0.55}
            y2={innerH * 0.55}
            stroke="#44403c"
            strokeWidth={2}
            strokeDasharray="4 3"
          />

          {/* Connecting path */}
          <path
            d={
              layout.points.length > 1
                ? `M ${layout.points.map((p) => `${p.cx},${p.cy}`).join(" L ")}`
                : ""
            }
            fill="none"
            stroke="#57534e"
            strokeWidth={2}
          />

          {/* Events */}
          {layout.points.map((p) => (
            <g key={p.date}>
              <circle
                cx={p.cx}
                cy={p.cy}
                r={p.type === "payday" ? 8 : 5}
                fill={TYPE_COLOR[p.type]}
                stroke="#0c0a09"
                strokeWidth={1.5}
              />
              {p.amount !== undefined && p.amount > 0 && (
                <text
                  x={p.cx}
                  y={p.cy - 14}
                  textAnchor="middle"
                  fill="#f5f5f4"
                  fontFamily="serif"
                  fontSize={10}
                  fontWeight={600}
                >
                  {formatCurrency(p.amount)}
                </text>
              )}
              <text
                x={p.cx}
                y={innerH + 18}
                textAnchor="middle"
                fill="#a8a29e"
                fontFamily="serif"
                fontSize={10}
              >
                {p.label}
              </text>
            </g>
          ))}

          {/* Ship at latest payday */}
          {layout.latestPayday && (
            <g
              transform={`translate(${layout.latestPayday.cx - 14}, ${layout.latestPayday.cy - 28})`}
              aria-hidden
            >
              {/* Hull */}
              <path
                d="M2 18 L6 10 L22 10 L26 18 Z"
                fill="#78350f"
                stroke="#451a03"
                strokeWidth={1}
              />
              {/* Cabin */}
              <rect x={10} y={6} width={8} height={5} rx={1} fill="#a16207" />
              {/* Mast */}
              <line x1={14} y1={6} x2={14} y2={0} stroke="#44403c" strokeWidth={1.5} />
              {/* Sail */}
              <path d="M14 1 L20 5 L14 5 Z" fill="#e7e5e4" opacity={0.9} />
              {/* Small wake */}
              <path
                d="M0 20 Q8 22 14 20 Q20 18 28 20"
                fill="none"
                stroke="#38bdf8"
                strokeWidth={1}
                opacity={0.5}
              />
            </g>
          )}
        </g>
      </svg>

      <p className="mt-1 px-1 font-serif text-xs text-stone-500">
        {layout.latestPayday
          ? "A ship enters the harbor — thy labor bears fruit."
          : "The harbor is quiet. Fair winds may yet bring a payday."}
      </p>
    </div>
  );
}

export default HarborPayday;
