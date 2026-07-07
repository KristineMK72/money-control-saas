import { BUILDINGS } from "./buildings";
import { WORLD_ASSETS } from "./worldAssets";
import { WORLD_LIMIT_X, WORLD_LIMIT_Z } from "./constants";

export function isBlocked(nextX: number, nextZ: number) {
  if (
    nextX < -WORLD_LIMIT_X ||
    nextX > WORLD_LIMIT_X ||
    nextZ < -WORLD_LIMIT_Z ||
    nextZ > WORLD_LIMIT_Z
  ) {
    return true;
  }

  for (const b of BUILDINGS) {
    const dx = nextX - b.x;
    const dz = nextZ - b.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < b.collide + 1.05) return true;
  }

  for (const asset of WORLD_ASSETS) {
    if (!asset.collide) continue;

    const dx = nextX - asset.x;
    const dz = nextZ - asset.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < asset.collide + 1.05) return true;
  }

  return false;
}
