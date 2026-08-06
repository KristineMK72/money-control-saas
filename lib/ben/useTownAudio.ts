"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  initAudio,
  playBell,
  playCoins,
  playThunder,
  setSoundEnabled,
  startTownAmbient,
  stopTownAmbient,
} from "@/lib/sounds";
import type { FinancialSnapshot } from "./types";

export type TownBed = "town" | "storm" | "harbor";
export type TownOneShot = "bell" | "ship_bell" | "thunder" | "coins";

/** Kept for callers that display audio diagnostics; sounds are generated in-browser. */
export const AUDIO_MANIFEST = {
  beds: { town: "procedural", storm: "procedural", harbor: "procedural" },
  oneShots: { bell: "procedural", ship_bell: "procedural", thunder: "procedural", coins: "procedural" },
} as const;

export interface UseTownAudioOptions {
  data?: FinancialSnapshot;
  enabled?: boolean;
  onNeedsUnlock?: () => void;
}

export interface TownAudioApi {
  bed: TownBed;
  unlocked: boolean;
  unlock: () => void;
  duck: () => void;
  unduck: () => void;
  setBed: (bed: TownBed) => void;
  playOneShot: (name: TownOneShot) => void;
  setEnabled: (on: boolean) => void;
  enabled: boolean;
}

function inferBed(data?: FinancialSnapshot, harborUntil?: number): TownBed {
  if (harborUntil && Date.now() < harborUntil) return "harbor";
  if (data?.overdueAmount && data.overdueAmount > 0) return "storm";
  return "town";
}

export function useTownAudio(options: UseTownAudioOptions = {}): TownAudioApi {
  const { data, enabled: initialEnabled = true, onNeedsUnlock } = options;
  const [enabled, setEnabledState] = useState(initialEnabled);
  const [unlocked, setUnlocked] = useState(false);
  const [bed, setBedState] = useState<TownBed>("town");
  const harborUntil = useRef(0);
  const previousData = useRef<FinancialSnapshot>();
  const ducked = useRef(false);

  const setBed = useCallback((next: TownBed) => {
    setBedState(next);
    if (!ducked.current) startTownAmbient(next);
  }, []);

  const unlock = useCallback(() => {
    try {
      initAudio();
      setUnlocked(true);
      if (enabled) setBed(inferBed(data, harborUntil.current));
    } catch {
      setUnlocked(false);
      onNeedsUnlock?.();
    }
  }, [data, enabled, onNeedsUnlock, setBed]);

  const playOneShot = useCallback((name: TownOneShot) => {
    if (!enabled) return;
    if (name === "coins") playCoins();
    else if (name === "thunder") playThunder();
    else playBell();
  }, [enabled]);

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    setSoundEnabled(on);
    if (!on) stopTownAmbient();
    else if (unlocked && !ducked.current) startTownAmbient(bed);
  }, [bed, unlocked]);

  const duck = useCallback(() => {
    ducked.current = true;
    stopTownAmbient();
  }, []);

  const unduck = useCallback(() => {
    ducked.current = false;
    if (unlocked && enabled) startTownAmbient(bed);
  }, [bed, enabled, unlocked]);

  useEffect(() => {
    if (!unlocked || !enabled) return;
    const previous = previousData.current;
    previousData.current = data;

    if (previous && data && (data.incomeThisMonth ?? 0) > (previous.incomeThisMonth ?? 0)) {
      harborUntil.current = Date.now() + 45000;
      playOneShot("ship_bell");
    }
    if (previous && data?.debtChange !== undefined && data.debtChange < (previous.debtChange ?? 0)) {
      playOneShot("bell");
    }
    if (data?.savingsProgress !== undefined && data.savingsProgress >= 1 && (previous?.savingsProgress ?? 0) < 1) {
      playOneShot("coins");
    }
    setBed(inferBed(data, harborUntil.current));
  }, [data, enabled, playOneShot, setBed, unlocked]);

  useEffect(() => () => stopTownAmbient(), []);

  return { bed, unlocked, unlock, duck, unduck, setBed, playOneShot, setEnabled, enabled };
}

export default useTownAudio;
