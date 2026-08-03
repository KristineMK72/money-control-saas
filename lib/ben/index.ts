/**
 * Public barrel for the Ben character system.
 *
 * Preferred import:
 *   import { Ben } from "@/lib/ben";
 *   // or
 *   import { Ben, type FinancialSnapshot } from "@/lib/ben";
 */

export { Ben } from "./brain";
export type {
  BenMood,
  BenLocation,
  SpeechContext,
  FinancialSnapshot,
  BenSpeechRequest,
  BenSpeech,
  BenLetter,
  TownCrierAnnouncement,
} from "./types";
export type { LetterType } from "./letters";
export type { Quest, QuestStatus } from "./quests";
export type { Reputation, ReputationTier } from "./reputation";

export { COLONIAL_TRIVIA, randomTrivia, pickTrivia } from "./trivia";
export type { ColonialTrivia } from "./trivia";

export { useTriviaTriggers } from "./useTriviaTriggers";
export type { TriviaTrigger, UseTriviaTriggersOptions } from "./useTriviaTriggers";

export { useTownAudio, AUDIO_MANIFEST } from "./useTownAudio";
export type { TownBed, TownOneShot, UseTownAudioOptions, TownAudioApi } from "./useTownAudio";
