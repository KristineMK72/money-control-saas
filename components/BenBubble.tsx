"use client";

import type { BenMood } from "@/lib/ben/types";

type BenBubbleProps = {
  message: string;
  mood?: BenMood;
};

const moodStyles: Record<BenMood, string> = {
  encouraging: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  stern: "border-burgundy-600/40 bg-red-700/40 text-white",
  witty: "border-yellow-400/20 bg-yellow-400/10 text-yellow-200",
  urgent: "border-orange-500/40 bg-orange-600/30 text-white",
  celebratory: "border-blue-400/20 bg-blue-400/10 text-blue-200",
  neutral: "border-stone-400/20 bg-stone-400/10 text-stone-200",
  welcoming: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  proud: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  concerned: "border-amber-500/30 bg-amber-600/20 text-amber-100",
  wise: "border-sky-400/20 bg-sky-400/10 text-sky-100",
};

export default function BenBubble({
  message,
  mood = "encouraging",
}: BenBubbleProps) {
  const style = moodStyles[mood] ?? moodStyles.encouraging;

  return (
    <div
      className={`rounded-2xl border p-4 text-sm font-medium ${style}`}
      style={{ maxWidth: "600px" }}
    >
      <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
        Ben's almanack:
      </div>
      <div className="text-base leading-relaxed">{message}</div>
    </div>
  );
}
