// /lib/ben/messages.ts

import { BenMood } from "./types";

export const BenMessages: Record<BenMood, string[]> = {
  urgent: [
    "Trouble has knocked upon the door.",
    "Let us steady the ship before the storm grows.",
  ],
  stern: [
    "Let us not delay what must be done.",
    "A small leak sinks a great ship.",
  ],
  encouraging: [
    "Steady progress is the mother of triumph.",
    "You are closer than you think.",
  ],
  witty: [
    "Even Franklin had off days — today need not be one.",
  ],
  celebratory: [
    "Well done! Prosperity smiles upon your efforts.",
    "Prosperity nods approvingly at your course.",
  ],
};
