"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { UnlockPropType } from "@/lib/world/levelUnlocks";

export function UnlockedWorldProp({ type, position }: { type: UnlockPropType; position: [number, number, number] }) {
  if (type === "PineTree") return <UnlockedPineTree position={position} />;
  if (type === "Chicken") return <UnlockedChicken position={position} />;
  if (type === "Sheep") return <UnlockedSheep position={position} />;
  if (type === "Cottage") return <UnlockedCottage position={position} />;
  if (type === "Crate") {
    return <mesh position={[position[0], 0.5, position[2]]} castShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#6e451f" roughness={0.95} /></mesh>;
  }
  if (type === "Barrel") {
    return <mesh position={[position[0], 0.65, position[2]]} castShadow><cylinderGeometry args={[0.45, 0.5, 1.3, 12]} /><meshStandardMaterial color="#5b3518" roughness={0.9} /></mesh>;
  }
  if (type === "FlagPole") {
    return (
      <group position={position}>
        <mesh position={[0, 3.5, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 7, 8]} /><meshStandardMaterial color="#5b3b20" roughness={0.9} /></mesh>
        <mesh position={[0.9, 5.8, 0]}><planeGeometry args={[1.8, 1.1]} /><meshStandardMaterial color="#8b1a1a" side={THREE.DoubleSide} /></mesh>
      </group>
    );
  }
  return (
    <group position={position}>
      <mesh position={[0, 1.25, 0]} castShadow><boxGeometry args={[4, 0.2, 2.2]} /><meshStandardMaterial color="#70451e" roughness={0.9} /></mesh>
      {[-1.7, 1.7].map((x) => <mesh key={x} position={[x, 0.65, 0]}><boxGeometry args={[0.16, 1.3, 0.16]} /><meshStandardMaterial color="#39220f" /></mesh>)}
      <mesh position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 12]}><boxGeometry args={[4.5, 0.12, 2.6]} /><meshStandardMaterial color="#8b1a1a" roughness={0.85} /></mesh>
    </group>
  );
}

function UnlockedPineTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={1.15}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 3.1, 7]} />
        <meshStandardMaterial color="#2d1709" roughness={0.98} />
      </mesh>
      {[0, 1, 2].map((layer) => (
        <mesh key={layer} position={[0, 3.35 + layer * 1.15, 0]} castShadow>
          <coneGeometry args={[1.7 - layer * 0.34, 2.35, 7]} />
          <meshStandardMaterial color={layer === 1 ? "#173f25" : "#12331f"} roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}

function UnlockedChicken({ position }: { position: [number, number, number] }) {
  const chicken = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!chicken.current) return;
    chicken.current.rotation.z = Math.sin(clock.elapsedTime * 3 + position[0]) * 0.04;
  });
  return (
    <group ref={chicken} position={position} scale={1.25}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.3, 10, 10]} />
        <meshStandardMaterial color="#e8dfc3" roughness={0.9} />
      </mesh>
      <mesh position={[0.24, 0.68, 0]} castShadow>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#f3ead2" roughness={0.88} />
      </mesh>
      <mesh position={[0.43, 0.68, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.22, 6]} />
        <meshStandardMaterial color="#d99a2b" roughness={0.85} />
      </mesh>
      <mesh position={[0.24, 0.88, 0]}>
        <coneGeometry args={[0.08, 0.2, 5]} />
        <meshStandardMaterial color="#9e2f24" roughness={0.9} />
      </mesh>
      {[-0.1, 0.1].map((z) => (
        <mesh key={z} position={[0, 0.14, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 5]} />
          <meshStandardMaterial color="#b57920" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function UnlockedSheep({ position }: { position: [number, number, number] }) {
  const sheep = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!sheep.current) return;
    sheep.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.025;
  });
  return (
    <group ref={sheep} position={position}>
      <mesh position={[0, 0.85, 0]} scale={[1.25, 0.85, 0.78]} castShadow>
        <dodecahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial color="#ded8c8" roughness={1} />
      </mesh>
      <mesh position={[0.78, 0.92, 0]} castShadow>
        <boxGeometry args={[0.48, 0.52, 0.42]} />
        <meshStandardMaterial color="#40362d" roughness={0.95} />
      </mesh>
      {[-0.42, 0.42].map((x) => [-0.22, 0.22].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.3, z]} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.62, 6]} />
          <meshStandardMaterial color="#332a24" roughness={0.96} />
        </mesh>
      )))}
    </group>
  );
}

function UnlockedCottage({ position }: { position: [number, number, number] }) {
  const facesTown = position[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={position} rotation={[0, facesTown, 0]}>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[7.5, 0.4, 6.5]} />
        <meshStandardMaterial color="#302416" roughness={0.98} />
      </mesh>
      <mesh position={[0, 2.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[7, 4.1, 6]} />
        <meshStandardMaterial color="#8a6742" roughness={0.92} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={`cottage-roof-${side}`} position={[side * 2.08, 5.7, 0]} rotation={[0, 0, -side * 0.59]} castShadow>
          <boxGeometry args={[5, 0.28, 7]} />
          <meshStandardMaterial color="#3c2115" roughness={0.96} />
        </mesh>
      ))}
      <mesh position={[0, 7.1, 0]} castShadow>
        <boxGeometry args={[0.24, 0.24, 7.12]} />
        <meshStandardMaterial color="#21120c" roughness={0.96} />
      </mesh>
      <mesh position={[-2.25, 6.2, -0.9]} castShadow>
        <boxGeometry args={[0.62, 2.5, 0.62]} />
        <meshStandardMaterial color="#4a2b1c" roughness={0.96} />
      </mesh>
      <mesh position={[0, 1.45, 3.04]} castShadow>
        <boxGeometry args={[1.25, 2.5, 0.12]} />
        <meshStandardMaterial color="#3b2011" roughness={0.9} />
      </mesh>
      {[-2.15, 2.15].map((x) => (
        <group key={x} position={[x, 2.35, 3.07]}>
          <mesh>
            <boxGeometry args={[1.25, 1.35, 0.12]} />
            <meshStandardMaterial color="#25170e" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[0.9, 1, 0.04]} />
            <meshStandardMaterial color="#f4c567" emissive="#d5963a" emissiveIntensity={0.8} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
