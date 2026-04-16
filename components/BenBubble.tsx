"use client";

type BenBubbleProps = {
  message: string;
  mood?: "encouraging" | "stern" | "witty" | "urgent" | "celebratory";
};

export default function BenBubble({ message, mood = "encouraging" }: BenBubbleProps) {
  const moodStyles: Record<string, string> = {
    encouraging: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    stern: "border-burgundy-600/40 bg-red-700/40 text-white",
    witty: "border-yellow-400/20 bg-yellow-400/10 text-yellow-200",
    urgent: "border-orange-400/20 bg-orange-400/10 text-orange-200",
    celebratory: "border-blue-400/20 bg-blue-400/10 text-blue-200",
  };

  return (
    <div
      className={`rounded-2xl border p-4 text-sm font-medium ${moodStyles[mood]}`}
      style={{ maxWidth: "600px" }}
    >
      <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
        Ben says:
      </div>
      <div className="text-base leading-relaxed">{message}</div>
    </div>
  );
}
