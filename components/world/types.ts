export type ViewMode = "map" | "street";

export type BuildingDef = {
  id: string;
  href: string;
  label: string;
  icon: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  brick: string;
  roof: string;
  win: string;
  enter: number;
  collide: number;
  pillars: boolean;
  large: boolean;
};

export type WorldAsset = {
  id: string;
  url: string;
  x: number;
  y?: number;
  z: number;
  scale?: number;
  rotY?: number;
  collide?: number;
  label?: string;
};

export type PlayerState = {
  userId: string;
  username: string;
  avatarIdx: number;
  x: number;
  z: number;
  yaw: number;
};
