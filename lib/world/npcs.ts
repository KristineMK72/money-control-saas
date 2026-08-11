export type TownNpc = {
  id: string;
  name: string;
  role: string;
  icon: string;
  sprite: string;
  position: [number, number, number];
  coatColor: string;
  scale: number;
  flip: boolean;
  tilt: number;
  walkRadius: number;
  walkSpeed: number;
  phase: number;
  lines: string[];
  isBen?: boolean;
};

export const TOWN_NPCS: readonly TownNpc[] = [
  {
    id: "ben",
    name: "Ben Franklin",
    role: "Town Advisor",
    icon: "⚡",
    sprite: "/npcs/ben.webp",
    position: [0, 0, 4],
    coatColor: "#477a2d",
    scale: 1.12,
    flip: false,
    tilt: 0,
    walkRadius: 0,
    walkSpeed: 0,
    phase: 0,
    isBen: true,
    lines: [
      "A budget is merely a plan for keeping thy dollars from joining the navy.",
      "Mind the little expenses; they are excellent swimmers and will escape the purse.",
      "The next wise move need not be grand. It only needs to be made.",
      "Credit is a useful horse, good friend—but do keep hold of the reins.",
    ],
  },
  {
    id: "merchant",
    name: "Merchant",
    role: "Market House",
    icon: "👜",
    sprite: "/npcs/merchant.webp",
    position: [-2.5, 0, -1.6],
    coatColor: "#9d3f35",
    scale: 0.96,
    flip: true,
    tilt: -0.018,
    walkRadius: 1.2,
    walkSpeed: 0.35,
    phase: 0.7,
    lines: [
      "A fair price pleases both purse and conscience.",
      "I keep the good apples in front and the better bargains in back.",
      "Count thy coins before the market bell, not after.",
    ],
  },
  {
    id: "postmaster",
    name: "Postmaster",
    role: "Post Office",
    icon: "✉️",
    sprite: "/npcs/postmaster.webp",
    position: [-3.2, 0, 5],
    coatColor: "#315f9b",
    scale: 0.94,
    flip: false,
    tilt: 0.014,
    walkRadius: 0.8,
    walkSpeed: 0.28,
    phase: 2.1,
    lines: [
      "Bad news travels fast. Bills travel first class.",
      "A letter answered promptly is one less pigeon on the mind.",
      "The post is on time; whether the payment is, I cannot say.",
    ],
  },
  {
    id: "blacksmith",
    name: "Blacksmith",
    role: "Smithy",
    icon: "⚒️",
    sprite: "/npcs/blacksmith.webp",
    position: [3.2, 0, 13],
    coatColor: "#5b6670",
    scale: 1.24,
    flip: true,
    tilt: -0.012,
    walkRadius: 1,
    walkSpeed: 0.4,
    phase: 3.4,
    lines: [
      "A sound plan is forged the same as iron: heat, patience, and steady blows.",
      "Repair the small crack before it asks for a new wheel.",
      "I can mend a hinge. Compound interest requires a different hammer.",
    ],
  },
  {
    id: "carpenter",
    name: "Carpenter",
    role: "Carpenter's Yard",
    icon: "🪚",
    sprite: "/npcs/carpenter.webp",
    position: [13, 0, 13],
    coatColor: "#765934",
    scale: 1.18,
    flip: false,
    tilt: 0.012,
    walkRadius: 1.1,
    walkSpeed: 0.3,
    phase: 1.8,
    lines: [
      "Measure twice, spend once. Timber and coin both resent waste.",
      "A sturdy house begins with a level foundation—and so does a budget.",
      "I build shelves for ledgers and doors against unnecessary expenses.",
    ],
  },
  {
    id: "farmer",
    name: "Farmer",
    role: "North Field",
    icon: "🌾",
    sprite: "/npcs/farmer.webp",
    position: [22, 0, 8],
    coatColor: "#a57932",
    scale: 0.98,
    flip: false,
    tilt: 0.02,
    walkRadius: 2,
    walkSpeed: 0.22,
    phase: 4.2,
    lines: [
      "Plant pennies with patience and one day they may resemble dollars.",
      "No harvest is hurried by staring sternly at the field.",
      "Keep seed for spring and coin for surprises.",
    ],
  },
  {
    id: "sailor",
    name: "Sailor",
    role: "Harbor Watch",
    icon: "⚓",
    sprite: "/npcs/sailor.webp",
    position: [-20, 0, -28],
    coatColor: "#197b86",
    scale: 0.97,
    flip: true,
    tilt: -0.016,
    walkRadius: 1.5,
    walkSpeed: 0.32,
    phase: 5.5,
    lines: [
      "A reserve fund is ballast. Ye miss it most when the weather turns.",
      "Never wager the whole cargo on a friendly wind.",
      "The harbor is calm, which is when sensible captains mend the sails.",
    ],
  },
] as const;

export function getNpcPosition(npc: TownNpc, elapsed: number) {
  if (!npc.walkRadius) return { x: npc.position[0], z: npc.position[2] };
  const t = elapsed * npc.walkSpeed + npc.phase;
  return {
    x: npc.position[0] + Math.cos(t) * npc.walkRadius,
    z: npc.position[2] + Math.sin(t) * npc.walkRadius,
  };
}
