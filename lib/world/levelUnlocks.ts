export type UnlockPropType = "MarketStall" | "Crate" | "Barrel" | "FlagPole";

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
    ],
  },
  {
    level: 3,
    props: [{ type: "MarketStall", position: [17, 0, 3] }],
  },
  {
    level: 4,
    props: [
      { type: "Crate", position: [19, 0, 6] },
      { type: "Barrel", position: [15, 0, 6] },
    ],
  },
  {
    level: 5,
    props: [{ type: "FlagPole", position: [0, 0, -27] }],
  },
];

export function getUnlockedProps(level: number) {
  return LEVEL_UNLOCKS
    .filter((unlock) => level >= unlock.level)
    .flatMap((unlock) => unlock.props);
}
