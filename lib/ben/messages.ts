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
  neutral: [
    "Let us examine the ledger with clear eyes.",
    "Here is the state of thy accounts.",
  ],
  welcoming: [
    "Good morrow — shall we tend the treasury?",
    "Well met! The books await thy guidance.",
  ],
  proud: [
    "Fine work. The colony takes notice.",
    "Thy diligence shows in the numbers.",
  ],
  concerned: [
    "A few items deserve thy attention.",
    "Let us mind these before they grow teeth.",
  ],
  wise: [
    "A penny saved is still a penny earned.",
    "Beware of little expenses; small leaks sink great ships.",
  ],
};
