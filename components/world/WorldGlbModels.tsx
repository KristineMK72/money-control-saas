"use client";

import { useGLTF } from "@react-three/drei";
import { WORLD_ASSETS } from "./worldAssets";
import type { WorldAsset } from "./types";

const HEAVY_ASSETS = new Set(["lightning", "stone-house"]);

function GlbAsset({ asset }: { asset: WorldAsset }) {
  const gltf = useGLTF(asset.url);
  return (
    <primitive
      object={gltf.scene.clone()}
      position={[asset.x, asset.y ?? 0, asset.z]}
      rotation={[0, asset.rotY ?? 0, 0]}
      scale={asset.scale ?? 1}
    />
  );
}

export default function WorldGlbModels({ isMobile }: { isMobile: boolean }) {
  const assets = WORLD_ASSETS.filter((asset) => {
    if (HEAVY_ASSETS.has(asset.id) && isMobile) return false;
    if (asset.id === "lightning") return false;
    return true;
  });

  return (
    <group>
      {assets.map((asset) => (
        <GlbAsset key={asset.id} asset={asset} />
      ))}
    </group>
  );
}

for (const asset of WORLD_ASSETS) {
  if (!HEAVY_ASSETS.has(asset.id)) {
    useGLTF.preload(asset.url);
  }
}
