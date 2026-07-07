"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  EYE_HEIGHT,
  FIRST_PERSON_POS,
  MAP_LOOK_AT,
  MAP_POS,
  SPEED,
} from "./constants";
import { isBlocked } from "./CollisionSystem";
import type { ViewMode } from "./types";

export default function CameraController({
  viewMode,
  moveRef,
  mobileYaw,
  isMobile,
  broadcast,
}: {
  viewMode: ViewMode;
  moveRef: React.MutableRefObject<{ f: number; r: number }>;
  mobileYaw: React.MutableRefObject<number>;
  isMobile: boolean;
  broadcast: (x: number, z: number, yaw: number) => void;
}) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    const cam = state.camera;
    const dt = Math.min(delta, 0.05);

    if (viewMode === "map") {
      const targetPos = new THREE.Vector3(...MAP_POS);
      const lookAt = new THREE.Vector3(...MAP_LOOK_AT);

      cam.position.lerp(targetPos, 0.055);
      cam.lookAt(lookAt);
      return;
    }

    if (cam.position.y > EYE_HEIGHT + 4) {
      const target = new THREE.Vector3(...FIRST_PERSON_POS);

      cam.position.lerp(target, 0.055);
      cam.lookAt(0, 1.4, 0);
      return;
    }

    const { f, r } = moveRef.current;

    if (isMobile) {
      cam.rotation.order = "YXZ";
      cam.rotation.y = mobileYaw.current;
    }

    if (f !== 0 || r !== 0) {
      const yaw = cam.rotation.y;

      const fwd = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
      );

      const rgt = new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
      );

      const dir = new THREE.Vector3()
        .addScaledVector(fwd, f)
        .addScaledVector(rgt, r)
        .normalize()
        .multiplyScalar(SPEED * dt);

      const next = cam.position.clone().add(dir);

      if (!isBlocked(next.x, next.z)) {
        cam.position.x = next.x;
        cam.position.z = next.z;
      }
    }

    cam.position.y = EYE_HEIGHT;
    broadcast(cam.position.x, cam.position.z, cam.rotation.y);
  });

  return null;
}
