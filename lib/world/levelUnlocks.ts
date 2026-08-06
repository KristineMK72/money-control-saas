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

export function getUnlockedProps(level: number) {
  return LEVEL_UNLOCKS
    .filter((unlock) => level >= unlock.level)
    .flatMap((unlock) => unlock.props);
}
