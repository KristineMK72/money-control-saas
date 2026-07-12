"use client";

import { useEffect, useState } from "react";

export default function CoordinateGrid() {
  const [coords, setCoords] = useState({ x: 0, z: 0 });

  // You can connect this to camera position via context or props later
  useEffect(() => {
    const interval = setInterval(() => {
      setCoords({
        x: (Math.random() * 80 - 40).toFixed(1) as any,
        z: (Math.random() * 100 - 50).toFixed(1) as any,
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-6 left-6 z-50 font-mono text-xs bg-black/80 text-emerald-400 p-4 rounded border border-emerald-500/30 backdrop-blur-sm">
      <div className="uppercase tracking-[2px] text-[10px] mb-1 text-emerald-500/70">COLONIAL SURVEY • LIVE</div>
      <div>X: {coords.x}   Z: {coords.z}</div>
      <div className="text-[10px] mt-2 text-emerald-500/60">GRID REF: FL-1776</div>
    </div>
  );
}
