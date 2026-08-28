export type UnlockPropType =
  | "MarketStall"
  | "Crate"
  | "Barrel"
  | "FlagPole"
  | "PineTree"
  | "Chicken"
  | "Sheep"
  | "Cottage";

export type LevelUnlock = {
  level: number;
  props: Array<{
    type: UnlockPropType;
    position: [number, number, number];
  }>;
};

export const LEVEL_UNLOCKS: LevelUnlock[] = [
  {
    level: 2,
    props: [
      { type: "Crate", position: [-5.5, 0, 13] },
      { type: "Barrel", position: [5.5, 0, 13] },
      { type: "PineTree", position: [-34, 0, 20] },
    ],
  },
  {
    level: 3,
    props: [
      { type: "MarketStall", position: [17, 0, 3] },
      { type: "Chicken", position: [20, 0, 11] },
    ],
  },
  {
    level: 4,
    props: [
      { type: "Crate", position: [19, 0, 6] },
      { type: "Barrel", position: [15, 0, 6] },
      { type: "Sheep", position: [-44, 0, 20] },
    ],
  },
  {
    level: 5,
    props: [
      { type: "FlagPole", position: [0, 0, -27] },
      { type: "PineTree", position: [35, 0, 20] },
    ],
  },
  {
    level: 6,
    props: [{ type: "Cottage", position: [-32, 0, 26] }],
  },
  {
    level: 7,
    props: [
      { type: "Chicken", position: [-20, 0, 28] },
      { type: "Sheep", position: [44, 0, 22] },
      { type: "PineTree", position: [-48, 0, 20] },
    ],
  },
  {
    level: 8,
    props: [{ type: "Cottage", position: [32, 0, 28] }],
  },
];

const ENDLESS_TYPES: UnlockPropType[] = [
  "Crate",
  "Barrel",
  "PineTree",
  "Chicken",
  "Sheep",
  "MarketStall",
  "Cottage",
];

/** Keep the GPU from drowning if someone lives here for years. */
export const MAX_PROCEDURAL_PROPS = 48;

function proceduralProp(level: number): {
  type: UnlockPropType;
  position: [number, number, number];
} {
  const ring = 18 + ((level * 3) % 32);
  const angle = (level * 2.399) % (Math.PI * 2);
  const x = Math.round(Math.cos(angle) * ring * 10) / 10;
  const z = Math.round(Math.sin(angle) * ring * 10) / 10;
  const type = ENDLESS_TYPES[level % ENDLESS_TYPES.length]!;
  return { type, position: [x, 0, z] };
}

export function getUnlockedProps(level: number) {
  const scripted = LEVEL_UNLOCKS.filter((unlock) => level >= unlock.level).flatMap(
    (unlock) => unlock.props
  );

  const extraLevels = Math.min(
    MAX_PROCEDURAL_PROPS,
    Math.max(0, Math.floor(level) - 8)
  );
  const extras = Array.from({ length: extraLevels }, (_, i) =>
    proceduralProp(9 + i)
  );

  return [...scripted, ...extras];
}
