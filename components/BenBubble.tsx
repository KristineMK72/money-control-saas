"use client";

import React from "react";

export type BenBubbleProps = {
  text: string;
  mood?: "witty" | "neutral" | "serious" | "encouraging";
};

export function BenBubble({ text, mood = "neutral" }: BenBubbleProps) {
  return (
    <div className="rounded-xl bg-blue-600 text-white p-4 shadow-md max-w-md">
      <p className="text-sm opacity-80 mb-1">Ben ({mood})</p>
      <p className="text-lg font-medium">{text}</p>
    </div>
  );
}

export default BenBubble;
