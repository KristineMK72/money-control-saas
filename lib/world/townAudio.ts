import { initAudio, startTownAmbient, stopTownAmbient } from "@/lib/sounds";

export type TownWeather = "clear" | "rain" | "fog";

export function ambientMoodForWeather(
  mode: TownWeather
): "town" | "storm" | "harbor" {
  if (mode === "rain") return "storm";
  if (mode === "fog") return "town";
  return "harbor";
}

/** Call from the Enter button click so browsers unlock Web Audio. */
export async function enterTownAudio(weather: TownWeather) {
  await initAudio();
  startTownAmbient(ambientMoodForWeather(weather));
}

export function syncTownAmbient(weather: TownWeather, exploring: boolean) {
  if (!exploring) {
    stopTownAmbient();
    return;
  }
  startTownAmbient(ambientMoodForWeather(weather));
}

export { stopTownAmbient };
