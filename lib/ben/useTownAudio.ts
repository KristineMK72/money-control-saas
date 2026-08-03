"use client";

/**
 * useTownAudio — ambient beds + one-shots for Franklin's Landing.
 *
 * State mapping (from FinancialSnapshot):
 *   overdueAmount > 0     → storm bed
 *   recent payday signal  → harbor bed (briefly)
 *   default               → town day bed
 *
 * One-shots:
 *   debt reduced          → church bell
 *   savings goal          → brighter bell / children (optional)
 *   payday                → ship bell
 *
 * Usage:
 *   const audio = useTownAudio({ data: financialSnapshot });
 *   // after user gesture:
 *   audio.unlock();
 *   // when Ben starts speaking:
 *   audio.duck();
 *   audio.unduck();
 *   // manual:
 *   audio.playOneShot("bell");
 *
 * Files expected under /public/audio/ (see AUDIO_MANIFEST below).
 * Uses HTMLAudioElement — no extra dependency. Swap for Howler if you prefer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FinancialSnapshot } from "./types";

export type TownBed = "town" | "storm" | "harbor";
export type TownOneShot = "bell" | "ship_bell" | "thunder" | "coins";

/** Paths relative to site root. Replace with your real assets. */
export const AUDIO_MANIFEST = {
  beds: {
    town: "/audio/bed_town_day.mp3",
    storm: "/audio/bed_storm.mp3",
    harbor: "/audio/bed_harbor.mp3",
  },
  oneShots: {
    bell: "/audio/oneshot_bell.mp3",
    ship_bell: "/audio/oneshot_ship_bell.mp3",
    thunder: "/audio/oneshot_thunder_soft.mp3",
    coins: "/audio/oneshot_coins.mp3",
  },
} as const;

const BED_VOLUME = 0.28;
const DUCKED_VOLUME = 0.08;
const ONESHOT_VOLUME = 0.45;
const CROSSFADE_MS = 1200;
const HARBOR_HOLD_MS = 45000; // how long payday keeps harbor bed

export interface UseTownAudioOptions {
  data?: FinancialSnapshot;
  /** Master enable — respect user / system preference */
  enabled?: boolean;
  /** Called when unlock is required (show a “Enable sound” affordance) */
  onNeedsUnlock?: () => void;
}

export interface TownAudioApi {
  /** Current bed */
  bed: TownBed;
  /** Whether audio context is unlocked for autoplay policies */
  unlocked: boolean;
  /** Call from a click/tap handler once */
  unlock: () => void;
  /** Lower bed under Ben / Town Crier speech */
  duck: () => void;
  unduck: () => void;
  /** Force a bed (e.g. preview in settings) */
  setBed: (bed: TownBed) => void;
  playOneShot: (name: TownOneShot) => void;
  /** Mute/unmute without losing unlock */
  setEnabled: (on: boolean) => void;
  enabled: boolean;
}

function createLoop(src: string): HTMLAudioElement {
  const el = new Audio(src);
  el.loop = true;
  el.preload = "auto";
  el.volume = 0;
  return el;
}

function createOneShot(src: string): HTMLAudioElement {
  const el = new Audio(src);
  el.preload = "auto";
  el.volume = ONESHOT_VOLUME;
  return el;
}

function fadeTo(
  el: HTMLAudioElement,
  target: number,
  ms: number,
  onDone?: () => void
) {
  const start = el.volume;
  const delta = target - start;
  if (Math.abs(delta) < 0.01 || ms <= 0) {
    el.volume = target;
    onDone?.();
    return () => {};
  }
  const t0 = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    el.volume = Math.max(0, Math.min(1, start + delta * t));
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

function inferBed(data?: FinancialSnapshot, harborUntil?: number): TownBed {
  if (harborUntil && Date.now() < harborUntil) return "harbor";
  if (data?.overdueAmount && data.overdueAmount > 0) return "storm";
  return "town";
}

export function useTownAudio(options: UseTownAudioOptions = {}): TownAudioApi {
  const { data, enabled: enabledProp = true, onNeedsUnlock } = options;

  const [enabled, setEnabledState] = useState(enabledProp);
  const [unlocked, setUnlocked] = useState(false);
  const [bed, setBedState] = useState<TownBed>("town");

  const bedsRef = useRef<Partial<Record<TownBed, HTMLAudioElement>>>({});
  const shotsRef = useRef<Partial<Record<TownOneShot, HTMLAudioElement>>>({});
  const currentBedRef = useRef<TownBed>("town");
  const duckedRef = useRef(false);
  const harborUntilRef = useRef(0);
  const cancelFadeRef = useRef<(() => void) | null>(null);
  const prevDataRef = useRef<FinancialSnapshot | undefined>(undefined);

  // Lazy-create elements once
  const ensureElements = useCallback(() => {
    (Object.keys(AUDIO_MANIFEST.beds) as TownBed[]).forEach((key) => {
      if (!bedsRef.current[key]) {
        bedsRef.current[key] = createLoop(AUDIO_MANIFEST.beds[key]);
      }
    });
    (Object.keys(AUDIO_MANIFEST.oneShots) as TownOneShot[]).forEach((key) => {
      if (!shotsRef.current[key]) {
        shotsRef.current[key] = createOneShot(AUDIO_MANIFEST.oneShots[key]);
      }
    });
  }, []);

  const targetVolume = useCallback(() => {
    if (!enabled) return 0;
    return duckedRef.current ? DUCKED_VOLUME : BED_VOLUME;
  }, [enabled]);

  const crossfadeTo = useCallback(
    (next: TownBed) => {
      ensureElements();
      const prev = currentBedRef.current;
      if (prev === next && bedsRef.current[next]?.volume) {
        // same bed — just fix volume
        const el = bedsRef.current[next]!;
        cancelFadeRef.current?.();
        cancelFadeRef.current = fadeTo(el, targetVolume(), 300);
        return;
      }

      const out = bedsRef.current[prev];
      const inn = bedsRef.current[next];
      if (!inn) return;

      cancelFadeRef.current?.();

      const startIn = () => {
        inn.currentTime = 0;
        const playPromise = inn.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Autoplay blocked
            setUnlocked(false);
            onNeedsUnlock?.();
          });
        }
        cancelFadeRef.current = fadeTo(inn, targetVolume(), CROSSFADE_MS);
      };

      if (out && !out.paused) {
        cancelFadeRef.current = fadeTo(out, 0, CROSSFADE_MS, () => {
          out.pause();
          startIn();
        });
      } else {
        startIn();
      }

      currentBedRef.current = next;
      setBedState(next);
    },
    [ensureElements, targetVolume, onNeedsUnlock]
  );

  const unlock = useCallback(() => {
    ensureElements();
    // Play+pause a bed to unlock on iOS/Safari
    const el = bedsRef.current.town ?? Object.values(bedsRef.current)[0];
    if (!el) return;
    el.volume = 0;
    el
      .play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        setUnlocked(true);
        crossfadeTo(inferBed(data, harborUntilRef.current));
      })
      .catch(() => {
        setUnlocked(false);
        onNeedsUnlock?.();
      });
  }, [ensureElements, crossfadeTo, data, onNeedsUnlock]);

  const duck = useCallback(() => {
    duckedRef.current = true;
    const el = bedsRef.current[currentBedRef.current];
    if (el) {
      cancelFadeRef.current?.();
      cancelFadeRef.current = fadeTo(el, enabled ? DUCKED_VOLUME : 0, 250);
    }
  }, [enabled]);

  const unduck = useCallback(() => {
    duckedRef.current = false;
    const el = bedsRef.current[currentBedRef.current];
    if (el) {
      cancelFadeRef.current?.();
      cancelFadeRef.current = fadeTo(el, enabled ? BED_VOLUME : 0, 400);
    }
  }, [enabled]);

  const setBed = useCallback(
    (next: TownBed) => {
      crossfadeTo(next);
    },
    [crossfadeTo]
  );

  const playOneShot = useCallback(
    (name: TownOneShot) => {
      if (!enabled) return;
      ensureElements();
      const el = shotsRef.current[name];
      if (!el) return;
      el.currentTime = 0;
      el.volume = ONESHOT_VOLUME;
      el.play().catch(() => {
        setUnlocked(false);
        onNeedsUnlock?.();
      });
    },
    [enabled, ensureElements, onNeedsUnlock]
  );

  const setEnabled = useCallback(
    (on: boolean) => {
      setEnabledState(on);
      const el = bedsRef.current[currentBedRef.current];
      if (el) {
        cancelFadeRef.current?.();
        cancelFadeRef.current = fadeTo(el, on ? (duckedRef.current ? DUCKED_VOLUME : BED_VOLUME) : 0, 300);
        if (on && el.paused && unlocked) {
          el.play().catch(() => {});
        }
      }
    },
    [unlocked]
  );

  // React to financial snapshot → bed + one-shots
  useEffect(() => {
    if (!unlocked || !enabled) return;

    const prev = prevDataRef.current;
    prevDataRef.current = data;

    // Payday detection: income jumped or explicit remaining cleared — treat as harbor
    const payday =
      prev &&
      data &&
      data.incomeThisMonth !== undefined &&
      prev.incomeThisMonth !== undefined &&
      data.incomeThisMonth > prev.incomeThisMonth;

    if (payday) {
      harborUntilRef.current = Date.now() + HARBOR_HOLD_MS;
      playOneShot("ship_bell");
    }

    // Debt paid down
    if (
      prev &&
      data &&
      data.debtChange !== undefined &&
      data.debtChange < 0 &&
      (prev.debtChange === undefined || data.debtChange < prev.debtChange)
    ) {
      playOneShot("bell");
    }

    // Savings goal reached
    if (
      data?.savingsProgress !== undefined &&
      data.savingsProgress >= 1 &&
      (prev?.savingsProgress === undefined || prev.savingsProgress < 1)
    ) {
      playOneShot("coins");
    }

    // Soft thunder when entering overdue
    if (
      data?.overdueAmount &&
      data.overdueAmount > 0 &&
      !(prev?.overdueAmount && prev.overdueAmount > 0)
    ) {
      playOneShot("thunder");
    }

    const nextBed = inferBed(data, harborUntilRef.current);
    if (nextBed !== currentBedRef.current) {
      crossfadeTo(nextBed);
    }
  }, [data, unlocked, enabled, crossfadeTo, playOneShot]);

  // Harbor hold timeout → return to inferred bed
  useEffect(() => {
    if (!unlocked) return;
    const id = setInterval(() => {
      if (harborUntilRef.current && Date.now() >= harborUntilRef.current) {
        harborUntilRef.current = 0;
        const next = inferBed(data, 0);
        if (next !== currentBedRef.current) crossfadeTo(next);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [data, unlocked, crossfadeTo]);

  // Sync enabled prop
  useEffect(() => {
    setEnabledState(enabledProp);
  }, [enabledProp]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelFadeRef.current?.();
      Object.values(bedsRef.current).forEach((el) => {
        el?.pause();
      });
    };
  }, []);

  return {
    bed,
    unlocked,
    unlock,
    duck,
    unduck,
    setBed,
    playOneShot,
    setEnabled,
    enabled,
  };
}

export default useTownAudio;
