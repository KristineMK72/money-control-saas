"use client";

import { useRef } from "react";
import { Sparkles, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BuildingDef } from "./townConfig";

export function Building({ def, active }: { def: BuildingDef; active: boolean }) {
  const { x, z, w, h, d, brick, roof, win, label, icon, pillars, large } = def;
  const left = x < 0;
  const fDir = left ? 1 : -1;
  const fx = (w / 2) * fDir;
  const frontX = fx + fDir * 0.08;
  const lowerWindows = large ? [-d * 0.34, 0, d * 0.34] : [-d * 0.3, d * 0.3];
  const upperWindows = large ? [-d * 0.28, d * 0.28] : [0];
  const roofHeight = large ? 2.7 : 2.15;
  const roofHalfRun = w / 2 + 0.65;
  const roofSlope = Math.sqrt(roofHalfRun * roofHalfRun + roofHeight * roofHeight);
  const roofAngle = Math.atan2(roofHeight, roofHalfRun);
  const signPostX = left ? x + w / 2 + 1.6 : x - w / 2 - 1.6;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 1, 0.44, d + 1]} />
        <meshStandardMaterial color="#241a0e" roughness={0.98} />
      </mesh>
      <mesh position={[0, h / 2 + 0.44, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={brick} roughness={0.82} metalness={0.02} />
      </mesh>
      {[-d / 2 + 0.16, d / 2 - 0.16].map((beamZ) => (
        <mesh key={`corner-${beamZ}`} position={[fx + fDir * 0.09, h / 2 + 0.46, beamZ]} castShadow>
          <boxGeometry args={[0.22, h, 0.3]} />
          <meshStandardMaterial color="#2a170d" roughness={0.9} />
        </mesh>
      ))}
      {[h * 0.35, h * 0.68].map((beamY) => (
        <mesh key={`cross-${beamY}`} position={[fx + fDir * 0.1, beamY + 0.44, 0]} castShadow>
          <boxGeometry args={[0.22, 0.25, d]} />
          <meshStandardMaterial color="#321b0e" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.44, 0]} castShadow>
        <boxGeometry args={[w + 1.1, 0.22, d + 1.1]} />
        <meshStandardMaterial color={roof} roughness={0.95} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={`roof-${side}`}>
          <mesh position={[side * roofHalfRun * 0.5, h + 0.44 + roofHeight * 0.5, 0]} rotation={[0, 0, -side * roofAngle]} castShadow receiveShadow>
            <boxGeometry args={[roofSlope, 0.3, d + 1.3]} />
            <meshStandardMaterial color={roof} roughness={0.92} metalness={0.03} />
          </mesh>
          {Array.from({ length: 5 }, (_, index) => (
            <mesh key={`shingle-${side}-${index}`} position={[side * (roofHalfRun * 0.12 + index * roofHalfRun * 0.18), h + 0.6 + index * roofHeight * 0.18, 0]} rotation={[0, 0, -side * roofAngle]} castShadow>
              <boxGeometry args={[0.09, 0.08, d + 1.38]} />
              <meshStandardMaterial color="#17100c" roughness={0.96} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, h + 0.44 + roofHeight, 0]} castShadow>
        <boxGeometry args={[0.28, 0.28, d + 1.48]} />
        <meshStandardMaterial color="#130d09" roughness={0.94} />
      </mesh>
      <Chimney position={[-w * 0.28, h + 0.44, -d * 0.18]} large={large} roof={roof} />
      <Chimney position={[w * 0.3, h + 0.44, d * 0.15]} large={large} roof={roof} />
      {lowerWindows.map((wz) => (
        <Window key={`l-${wz}`} position={[frontX, h * 0.58 + 0.44, wz]} color={win} active={active} rotY={left ? Math.PI / 2 : -Math.PI / 2} />
      ))}
      {upperWindows.map((wz) => (
        <Window key={`u-${wz}`} position={[frontX, h * 0.82 + 0.44, wz]} color={win} active={active} rotY={left ? Math.PI / 2 : -Math.PI / 2} />
      ))}
      <group position={[frontX, h * 0.22 + 0.44, 0]} rotation={[0, left ? Math.PI / 2 : -Math.PI / 2, 0]}>
        <AnimatedDoor h={h} win={win} active={active} />
      </group>
      {pillars && [-d * 0.34, -d * 0.13, d * 0.13, d * 0.34].map((px) => (
        <mesh key={px} position={[fx + fDir * 0.55, h * 0.3 + 0.44, px]} castShadow>
          <cylinderGeometry args={[0.18, 0.23, h * 0.6, 12]} />
          <meshStandardMaterial color="#3a2510" roughness={0.85} />
        </mesh>
      ))}
      {pillars && (
        <mesh position={[fx + fDir * 0.53, h * 0.6 + 0.44, 0]}>
          <boxGeometry args={[0.55, 0.32, d * 0.88]} />
          <meshStandardMaterial color="#2a1c0c" roughness={0.9} />
        </mesh>
      )}
      <pointLight position={[fx + fDir * 1.8, h * 0.58, 0]} intensity={active ? 8 : 3.8} distance={active ? 16 : 11} color={win} decay={2} />
      {active && (
        <>
          <mesh position={[fx + fDir * 1.35, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.65, 2.32, 48]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} />
          </mesh>
          <pointLight position={[fx + fDir * 1.65, 2.2, 0]} intensity={9} distance={12} color="#fbbf24" decay={2} />
          <Sparkles count={38} scale={[2, 3.1, 3.2]} position={[fx + fDir * 1.8, 2.2, 0]} size={3} speed={0.9} color="#fbbf24" opacity={0.85} />
        </>
      )}
      <BuildingSign label={label} icon={icon} active={active} position={[left ? w / 2 + 0.14 : -(w / 2 + 0.14), h * 0.68 + 0.44, 0]} rotY={left ? Math.PI / 2 : -Math.PI / 2} />
      <StreetSignPost label={label} icon={icon} active={active} position={[signPostX - x, 0, 0]} faceLeft={left} />
    </group>
  );
}

function AnimatedDoor({ h, win, active }: { h: number; win: string; active: boolean }) {
  const doorPanelRef = useRef<THREE.Group>(null);
  const doorW = 1.28;
  const doorH = h * 0.38;
  useFrame((_, delta) => {
    if (!doorPanelRef.current) return;
    const target = active ? -Math.PI * 0.65 : 0;
    doorPanelRef.current.rotation.y = THREE.MathUtils.lerp(doorPanelRef.current.rotation.y, target, delta * 5);
  });
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.65, h * 0.45, 0.13]} />
        <meshStandardMaterial color="#1c0e06" roughness={0.9} />
      </mesh>
      <group ref={doorPanelRef} position={[-doorW / 2, 0, 0.07]}>
        <mesh position={[doorW / 2, 0, 0]}>
          <boxGeometry args={[doorW, doorH, 0.065]} />
          <meshStandardMaterial color="#3d1a08" roughness={0.82} />
        </mesh>
        <mesh position={[doorW / 2, doorH * 0.18, 0.038]}>
          <boxGeometry args={[doorW * 0.7, doorH * 0.35, 0.02]} />
          <meshStandardMaterial color="#2a1005" roughness={0.88} />
        </mesh>
        <mesh position={[doorW / 2, -doorH * 0.2, 0.038]}>
          <boxGeometry args={[doorW * 0.7, doorH * 0.35, 0.02]} />
          <meshStandardMaterial color="#2a1005" roughness={0.88} />
        </mesh>
        <mesh position={[doorW - 0.14, -0.08, 0.06]}>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color="#d6a23a" emissive="#d6a23a" emissiveIntensity={active ? 1.2 : 0.4} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      <mesh position={[0, h * 0.21, 0.1]}>
        <boxGeometry args={[1.3, 0.44, 0.05]} />
        <meshStandardMaterial color={win} emissive={win} emissiveIntensity={active ? 2.4 : 1.2} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

function BuildingSign({ label, icon, position, active, rotY = 0 }: { label: string; icon: string; position: [number, number, number]; active: boolean; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.68, -0.1]} castShadow>
        <boxGeometry args={[2.6, 0.12, 0.12]} />
        <meshStandardMaterial color="#1c140f" metalness={0.8} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.12, 0.96, 0.15]} />
        <meshStandardMaterial color={active ? "#6b3818" : "#4a2a12"} roughness={0.68} emissive={active ? "#3a2010" : "#000000"} emissiveIntensity={active ? 0.5 : 0} />
      </mesh>
      <Text position={[0, 0.04, 0.18]} fontSize={0.27} anchorX="center" anchorY="middle" color="#ffe8a3" outlineWidth={0.02} outlineColor="#1a1208">{icon}</Text>
      <Text position={[0, -0.28, 0.18]} fontSize={0.145} maxWidth={1.72} textAlign="center" anchorX="center" anchorY="middle" color={active ? "#fff9d8" : "#f0c96a"} outlineWidth={0.022} outlineColor="#0f0a05" lineHeight={1.1}>{label.toUpperCase().replace(/ /g, "\n")}</Text>
    </group>
  );
}

function StreetSignPost({ label, icon, position, active, faceLeft }: { label: string; icon: string; position: [number, number, number]; active: boolean; faceLeft: boolean }) {
  const rotY = faceLeft ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.08, 2.2, 8]} />
        <meshStandardMaterial color="#3a2010" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[1.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#3a2010" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.68, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.58, 0.1]} />
        <meshStandardMaterial color={active ? "#7a4020" : "#5a3018"} roughness={0.75} emissive={active ? "#3a1a08" : "#000"} emissiveIntensity={active ? 0.5 : 0} />
      </mesh>
      {[-0.6, 0.6].map((ox) => (
        <mesh key={ox} position={[ox, 1.95, 0.04]}>
          <cylinderGeometry args={[0.012, 0.012, 0.52, 6]} />
          <meshStandardMaterial color="#8a6830" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <Text position={[-0.38, 1.68, 0.12]} fontSize={0.22} anchorX="center" anchorY="middle" color="#ffe8a3">{icon}</Text>
      <Text position={[0.12, 1.68, 0.12]} fontSize={0.115} maxWidth={0.9} textAlign="left" anchorX="left" anchorY="middle" color={active ? "#fff9d8" : "#e8c870"} outlineWidth={0.018} outlineColor="#1a0e04" lineHeight={1.15}>{label.replace("\n", " ").toUpperCase()}</Text>
    </group>
  );
}

function Window({ position, color, active, rotY = 0 }: { position: [number, number, number]; color: string; active: boolean; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[0.9, 1.15, 0.08]} />
        <meshStandardMaterial color="#1c0f08" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.62, 0.86, 0.035]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 2.6 : 1.5} transparent opacity={0.78} />
      </mesh>
    </group>
  );
}

function Chimney({ position, large, roof }: { position: [number, number, number]; large: boolean; roof: string }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.65, large ? 3.0 : 2.2, 0.65]} />
        <meshStandardMaterial color={roof} roughness={0.95} />
      </mesh>
    </group>
  );
}
