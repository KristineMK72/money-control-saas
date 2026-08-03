"use client";

import { useMemo } from "react";
import { Ben as BenBrain } from "@/lib/ben";
import type {
  BenMood,
  BenLocation,
  BenSpeech,
  FinancialSnapshot,
  SpeechContext,
} from "@/lib/ben";

type Animation = NonNullable<BenSpeech["animation"]>;

export interface BenProps {
  speech?: string;
  mood?: BenMood;
  location?: BenLocation;
  animation?: Animation;
  title?: string;
  context?: SpeechContext;
  data?: FinancialSnapshot;
  size?: "sm" | "md" | "lg";
  showNameplate?: boolean;
  className?: string;
  onDismiss?: () => void;
}

const MOOD_STYLES: Record<BenMood, { border: string; glow: string; badge: string }> = {
  neutral: { border: "border-amber-800/40", glow: "shadow-amber-900/10", badge: "bg-amber-900/20 text-amber-100" },
  welcoming: { border: "border-emerald-700/50", glow: "shadow-emerald-800/20", badge: "bg-emerald-900/30 text-emerald-100" },
  proud: { border: "border-yellow-600/50", glow: "shadow-yellow-700/25", badge: "bg-yellow-900/30 text-yellow-100" },
  concerned: { border: "border-orange-700/50", glow: "shadow-orange-800/20", badge: "bg-orange-900/30 text-orange-100" },
  urgent: { border: "border-red-700/60", glow: "shadow-red-800/30", badge: "bg-red-900/40 text-red-100" },
  encouraging: { border: "border-sky-700/50", glow: "shadow-sky-800/20", badge: "bg-sky-900/30 text-sky-100" },
  celebratory: { border: "border-yellow-500/60", glow: "shadow-yellow-600/30", badge: "bg-yellow-800/40 text-yellow-50" },
  stern: { border: "border-stone-600/50", glow: "shadow-stone-800/20", badge: "bg-stone-800/40 text-stone-200" },
  wise: { border: "border-indigo-700/50", glow: "shadow-indigo-800/20", badge: "bg-indigo-900/30 text-indigo-100" },
};

const ANIMATION_EMOJI: Record<Animation, string> = {
  wave: "👋",
  nod: "🫡",
  point: "☝️",
  celebrate: "🎉",
  stern: "🧐",
  write: "✒️",
};

const SIZE_CLASSES = {
  sm: "max-w-sm text-sm",
  md: "max-w-md text-base",
  lg: "max-w-lg text-lg",
};

export function Ben({
  speech: speechProp,
  mood: moodProp,
  location = "Dashboard",
  animation: animationProp,
  title: titleProp,
  context = "greeting",
  data,
  size = "md",
  showNameplate = true,
  className = "",
  onDismiss,
}: BenProps) {
  const resolved = useMemo(() => {
    if (speechProp) {
      return {
        text: speechProp,
        mood: moodProp ?? "welcoming",
        animation: animationProp ?? "wave",
        title: titleProp,
      };
    }
    const result = BenBrain.speak({ context, location, data, mood: moodProp });
    return {
      text: result.text,
      mood: result.mood,
      animation: result.animation ?? "nod",
      title: titleProp ?? result.title,
    };
  }, [speechProp, moodProp, location, animationProp, titleProp, context, data]);

  const styles = MOOD_STYLES[resolved.mood];
  const emoji = ANIMATION_EMOJI[resolved.animation];

  const rootClass =
    "relative rounded-xl border-2 bg-gradient-to-b from-stone-900 to-stone-950 p-4 text-stone-100 shadow-lg " +
    styles.border +
    " " +
    styles.glow +
    " " +
    SIZE_CLASSES[size] +
    " " +
    className;

  const badgeClass =
    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
    styles.badge;

  return (
    <div className={rootClass} role="dialog" aria-label="Message from Benjamin Franklin">
      {showNameplate && (
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/40 text-xl ring-2 ring-amber-700/50"
            aria-hidden
          >
            {emoji}
          </div>
          <div className="flex-1">
            <div className="font-serif text-sm font-semibold tracking-wide text-amber-100">
              Benjamin Franklin
            </div>
            <div className="text-xs text-stone-400">
              {location === "TownCrier" ? "Town Crier" : "Franklin's Landing"}
            </div>
          </div>
          <span className={badgeClass}>{resolved.mood}</span>
        </div>
      )}
      {resolved.title && (
        <p className="mb-1 font-serif text-xs font-bold uppercase tracking-widest text-amber-300/90">
          {resolved.title}
        </p>
      )}
      <p className="font-serif leading-relaxed text-stone-100 whitespace-pre-line">
        {resolved.text}
      </p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-lg border border-amber-800/40 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-900/50 active:scale-[0.98]"
        >
          Continue
        </button>
      )}
    </div>
  );
}

export default Ben;
