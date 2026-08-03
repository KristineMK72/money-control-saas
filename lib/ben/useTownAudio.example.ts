"use client";

/**
 * Example: wire town audio into the dashboard shell.
 *
 * 1. Put mp3s in public/audio/ (see AUDIO_MANIFEST in useTownAudio.ts)
 * 2. Call unlock() from the first user tap (e.g. dismiss parchment or "Enable sound")
 * 3. duck()/unduck() around Ben speech
 */

import { useTownAudio, AUDIO_MANIFEST } from "@/lib/ben";
import type { FinancialSnapshot } from "@/lib/ben";

export function useDashboardAudio(data: FinancialSnapshot) {
  const audio = useTownAudio({
    data,
    enabled: true,
    onNeedsUnlock: () => {
      // optional: set state to show "Tap to enable town sounds"
    },
  });

  return audio;
}

/*
  In your page:

  const audio = useDashboardAudio(financialSnapshot);

  // On first interaction:
  <button onClick={() => audio.unlock()}>Enable town sounds</button>

  // When Town Crier / Ben speaks:
  audio.duck();
  // on speech end:
  audio.unduck();

  // After successful bill payment:
  audio.playOneShot("bell");

  // Debug current bed:
  // audio.bed → "town" | "storm" | "harbor"
*/
