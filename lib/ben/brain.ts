/**
 * Ben's Brain — the single public entry point.
 *
 * Every page in AskBen / Franklin's Landing should import from here
 * (or from the barrel index) instead of hardcoding text.
 *
 * Example:
 *   import { Ben } from "@/lib/ben/brain";
 *   const speech = Ben.speak({ context: "greeting", location: "Bank", data });
 *   const letter = Ben.writeLetter({ type: "billReminder", billName: "electric account", daysUntilDue: 2 });
 */

import { speak, buildArrivalAnnouncement } from "./speech";
import { writeLetter, type LetterType } from "./letters";
import { announceArrival, crierStatus, announce } from "./townCrier";
import { suggestQuests, celebrateQuest } from "./quests";
import { computeReputation, commentOnReputation } from "./reputation";
import { generateGreeting } from "./greetings";
import { inferMood, BEN_IDENTITY, MOOD_TRAITS } from "./personality";
import { randomTrivia, pickTrivia, COLONIAL_TRIVIA } from "./trivia";

import type {
  BenSpeechRequest,
  BenSpeech,
  BenLetter,
  FinancialSnapshot,
  BenLocation,
  BenMood,
  TownCrierAnnouncement,
} from "./types";

export const Ben = {
  /** Core identity */
  identity: BEN_IDENTITY,

  /** Produce in-character speech for any context */
  speak(request: BenSpeechRequest): BenSpeech {
    return speak(request);
  },

  /** Quick greeting for a location */
  greet(location: BenLocation = "Dashboard", data?: FinancialSnapshot, mood?: BenMood): BenSpeech {
    const g = generateGreeting(location, data, mood);
    return {
      text: g.text,
      mood: g.mood,
      location,
      title: g.title,
      animation: MOOD_TRAITS[g.mood].animation,
    };
  },

  /** Compose a colonial letter */
  writeLetter(request: {
    type: LetterType;
    data?: FinancialSnapshot;
    billName?: string;
    daysUntilDue?: number;
  }): BenLetter {
    return writeLetter(request);
  },

  /** Town Crier: full arrival parchment */
  announceArrival(data?: FinancialSnapshot): TownCrierAnnouncement {
    return announceArrival(data);
  },

  /** Town Crier: status snapshot */
  crierStatus(data?: FinancialSnapshot): TownCrierAnnouncement {
    return crierStatus(data ?? {});
  },

  /** Town Crier: free-form announcement */
  announce(message: string, title?: string): TownCrierAnnouncement {
    return announce(message, title);
  },

  /** Multi-line arrival summary (raw lines + actions) */
  buildArrival(data: FinancialSnapshot) {
    return buildArrivalAnnouncement(data);
  },

  /** Suggest quests from current finances */
  suggestQuests(data?: FinancialSnapshot) {
    return suggestQuests(data);
  },

  /** Celebrate a completed quest */
  celebrateQuest(quest: Parameters<typeof celebrateQuest>[0]) {
    return celebrateQuest(quest);
  },

  /** Compute reputation score + tier */
  reputation(data?: FinancialSnapshot) {
    return computeReputation(data);
  },

  /** Ben comments on current reputation */
  commentOnReputation(data?: FinancialSnapshot) {
    return commentOnReputation(data);
  },

  /** Infer mood from data (exposed for UI) */
  inferMood,

  /** Random colonial trivia */
  trivia: randomTrivia,
  /** Pick several trivia items */
  pickTrivia,
  /** Full trivia catalog */
  TRIVIA: COLONIAL_TRIVIA,
} as const;

export type { BenSpeech, BenLetter, FinancialSnapshot, BenLocation, BenMood, TownCrierAnnouncement };
export type { LetterType };
