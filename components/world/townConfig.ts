import { COLONIAL_TRIVIA } from "@/lib/ben/trivia";
import type { TownNpc } from "@/lib/world/npcs";

export const SPEED = 10;
export const EYE_HEIGHT = 1.75;
export const START_POS: [number, number, number] = [0, 34, 44];
export const FIRST_PERSON_POS: [number, number, number] = [0, EYE_HEIGHT, 27];
export const CHANNEL = "franklins-landing-v4";
export const NPC_INTERACTION_DISTANCE = 4.4;
const WORLD_TRIVIA = COLONIAL_TRIVIA;

export type WeatherMode = "clear" | "rain" | "fog";
export type TimeMode = "morning" | "midday" | "evening" | "night";
export type DialogueState = { npc: TownNpc; text: string } | null;

export const TIME_LIGHTING: Record<TimeMode, {
  sky: string;
  fog: string;
  ambient: string;
  ambientIntensity: number;
  sun: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  hemisphere: [string, string, number];
  lantern: number;
}> = {
  morning: {
    sky: "#c98f62", fog: "#6f5039", ambient: "#ffd7a1", ambientIntensity: 1.25,
    sun: "#ffbf78", sunIntensity: 2.8, sunPosition: [-70, 35, -50], hemisphere: ["#e7b779", "#332416", 1.2], lantern: 2.5,
  },
  midday: {
    sky: "#78a9cc", fog: "#6c7d7f", ambient: "#fff4da", ambientIntensity: 1.65,
    sun: "#fff1c2", sunIntensity: 4.3, sunPosition: [45, 85, -35], hemisphere: ["#bfe1f2", "#403426", 1.65], lantern: 1.2,
  },
  evening: {
    sky: "#a75c42", fog: "#5b382b", ambient: "#ffc382", ambientIntensity: 1.05,
    sun: "#ff984f", sunIntensity: 3.1, sunPosition: [70, 24, -55], hemisphere: ["#d88155", "#251711", 1.05], lantern: 5.5,
  },
  night: {
    sky: "#101c2d", fog: "#1a2633", ambient: "#8ba8ca", ambientIntensity: 1.05,
    sun: "#b8cff0", sunIntensity: 2.05, sunPosition: [-30, 45, 20], hemisphere: ["#41648d", "#171b20", 1.15], lantern: 10.5,
  },
};

export function getTimeMode(): TimeMode {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "midday";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function randomWeather(): WeatherMode {
  const roll = Math.random();
  if (roll < 0.18) return "rain";
  if (roll < 0.36) return "fog";
  return "clear";
}

export function randomWorldTrivia(preferMoney: boolean) {
  const moneyFacts = WORLD_TRIVIA.filter((fact) => fact.category === "money" || fact.category === "proverb");
  const pool = preferMoney && moneyFacts.length ? moneyFacts : WORLD_TRIVIA;
  return pool[Math.floor(Math.random() * pool.length)]!.text;
}

export const BUILDINGS = [
  { id: "gov",    href: "/dashboard",    label: "Governor's\nOffice", icon: "🏛",  x: -10, z: -16, w: 10, h: 7,   d: 9, brick: "#7a4a2a", roof: "#3a2418", win: "#ffe066", enter: 12, pillars: true,  large: true  },
  { id: "income", href: "/income",       label: "Income\nLedger",     icon: "📜",  x: -10, z:  -5, w:  7, h: 5,   d: 7, brick: "#6b3d1e", roof: "#2e1a10", win: "#6ee7b7", enter: 10, pillars: false, large: false },
  { id: "bills",  href: "/bills",        label: "Post\nOffice",       icon: "📬",  x: -10, z:   6, w:  7, h: 5,   d: 7, brick: "#8a5530", roof: "#3a2218", win: "#fdba74", enter: 10, pillars: false, large: false },
  { id: "pay",    href: "/payments",     label: "Payment\nHall",      icon: "🪙",  x: -10, z:  17, w:  8, h: 5.5, d: 8, brick: "#7d4a18", roof: "#2e1e0a", win: "#fcd34d", enter: 10, pillars: true,  large: false },
  { id: "trophy", href: "/achievements", label: "Trophy\nRoom",       icon: "🏆",  x:  10, z: -16, w: 10, h: 7,   d: 9, brick: "#8a3a28", roof: "#3a1810", win: "#fca5a5", enter: 12, pillars: true,  large: true  },
  { id: "obs",    href: "/forecast",     label: "Observatory",        icon: "🔭",  x:  10, z:  -5, w:  7, h: 6,   d: 7, brick: "#2a5280", roof: "#142840", win: "#bfdbfe", enter: 10, pillars: false, large: false },
  { id: "cal",    href: "/calendar",     label: "Town\nHall",         icon: "🗓️", x:  10, z:   6, w:  7, h: 5,   d: 7, brick: "#6a5020", roof: "#2e2410", win: "#c4b5fd", enter: 10, pillars: false, large: false },
  { id: "set",    href: "/settings",     label: "Smithy",             icon: "⚙️", x:  10, z:  17, w:  7, h: 5,   d: 7, brick: "#504848", roof: "#201c1c", win: "#cbd5e1", enter: 10, pillars: false, large: false },
] as const;

export type BuildingDef = (typeof BUILDINGS)[number];

export const AVATARS = [
  { coat: "#087f68", hat: "#17130f", skin: "#d4a876" },
  { coat: "#24558a", hat: "#0a0e1a", skin: "#c49060" },
  { coat: "#8a3f2d", hat: "#1a0f04", skin: "#d4a876" },
  { coat: "#396b3d", hat: "#081408", skin: "#a87040" },
  { coat: "#664487", hat: "#0a0818", skin: "#d4a876" },
  { coat: "#7d315f", hat: "#1a0824", skin: "#b08050" },
];

export type PlayerState = {
  userId: string;
  username: string;
  avatarIdx: number;
  x: number;
  z: number;
  yaw: number;
};

export function isBlockedByBuilding(px: number, pz: number): boolean {
  const margin = 1.0;
  return BUILDINGS.some((b) => {
    return (
      Math.abs(px - b.x) < b.w / 2 + margin &&
      Math.abs(pz - b.z) < b.d / 2 + margin
    );
  });
}
