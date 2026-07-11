"use client";

import { PointerLockControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import CameraController from "./CameraController";
import CoordinateGrid from "./CoordinateGrid";
import { BUILDINGS } from "./buildings";
import type { BuildingDef, PlayerState, ViewMode } from "./types";

export default function Scene({
  viewMode,
  moveRef,
  mobileYaw,
  isMobile,
  onControlsReady,
  others,
  broadcast,
}: {
  viewMode: ViewMode;
  moveRef: React.MutableRefObject<{ f: number; r: number }>;
  mobileYaw: React.MutableRefObject<number>;
  isMobile: boolean;
  onControlsReady: (controls: any) => void;
  others: Record<string, PlayerState>;
  broadcast: (x: number, z: number, yaw: number) => void;
}) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current || isMobile) return;
    onControlsReady(controlsRef.current);
  }, [isMobile, onControlsReady]);

  return (
    <>
      <CameraController
        viewMode={viewMode}
        moveRef={moveRef}
        mobileYaw={mobileYaw}
        isMobile={isMobile}
        broadcast={broadcast}
      />

      <ambientLight intensity={0.45} />

      <directionalLight
        position={[32, 52, -34]}
        intensity={2.1}
        castShadow
      />

      <CoordinateGrid />

      {/* Temporary building markers so we can test the new map */}
      {BUILDINGS.map((b) => (
        <BuildingMarker key={b.id} building={b} />
      ))}

      {!isMobile && viewMode === "street" && (
        <PointerLockControls ref={controlsRef} />
      )}
    </>
  );
}

function BuildingMarker({ building }: { building: BuildingDef }) {
  return (
    <group position={[building.x, 0, building.z]}>
      <mesh position={[0, building.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[building.w, building.h, building.d]} />
        <meshStandardMaterial color={building.brick} />
      </mesh>
    </group>
  );
}
