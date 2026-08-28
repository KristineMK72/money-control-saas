"use client";

import { useMemo, useRef } from "react";
import { Sky, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUILDINGS, type TimeMode, type WeatherMode } from "./townConfig";

export function WorldLighting({ weather, mode, isMobile }: { weather: WeatherMode; mode: TimeMode; isMobile: boolean }) {
  const lighting = TIME_LIGHTING_SAFE[mode];
  const fogNear = weather === "fog" ? 18 : weather === "rain" ? 42 : 68;
  const fogFar = weather === "fog" ? 145 : weather === "rain" ? 245 : 360;
  const skySun = mode === "night" ? [0, -15, -20] as [number, number, number] : lighting.sunPosition;
  return (
    <>
      <color attach="background" args={[lighting.sky]} />
      <Sky distance={4500} sunPosition={skySun} turbidity={mode === "night" ? 10 : weather === "fog" ? 12 : 6} rayleigh={mode === "midday" ? 1.5 : 0.75} mieCoefficient={weather === "fog" ? 0.02 : 0.006} />
      <fog attach="fog" args={[lighting.fog, fogNear, fogFar]} />
      <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambient} />
      <directionalLight position={lighting.sunPosition} intensity={lighting.sunIntensity} color={lighting.sun} castShadow={!isMobile} shadow-mapSize={[isMobile ? 512 : 2048, isMobile ? 512 : 2048]} shadow-camera-near={1} shadow-camera-far={240} shadow-camera-left={-80} shadow-camera-right={80} shadow-camera-top={80} shadow-camera-bottom={-80} shadow-bias={-0.001} />
      <hemisphereLight args={lighting.hemisphere} />
    </>
  );
}

import { TIME_LIGHTING as TIME_LIGHTING_SAFE } from "./townConfig";

export function LightRain({ isMobile }: { isMobile: boolean }) {
  const rain = useRef<THREE.Points>(null);
  const count = isMobile ? 90 : 180;
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      data[index * 3] = (Math.random() - 0.5) * 42;
      data[index * 3 + 1] = Math.random() * 24;
      data[index * 3 + 2] = (Math.random() - 0.5) * 42;
    }
    return data;
  }, [count]);
  useFrame(({ camera }, delta) => {
    if (!rain.current) return;
    rain.current.position.x = camera.position.x;
    rain.current.position.z = camera.position.z;
    const attribute = rain.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < count; index += 1) {
      const yIndex = index * 3 + 1;
      attribute.array[yIndex] = Number(attribute.array[yIndex]) - delta * 13;
      if (Number(attribute.array[yIndex]) < 0) attribute.array[yIndex] = 24;
    }
    attribute.needsUpdate = true;
  });
  return (
    <points ref={rain} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b9d8e8" size={0.075} transparent opacity={0.58} depthWrite={false} />
    </points>
  );
}

export function InfiniteTerrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 310]} receiveShadow>
      <planeGeometry args={[1200, 680]} />
      <meshStandardMaterial color="#100c06" roughness={0.98} />
    </mesh>
  );
}

export function HarborWater() {
  const nearShore = useRef<THREE.Mesh>(null);
  const deepWater = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (nearShore.current) nearShore.current.position.y = -0.14 + Math.sin(elapsed * 1.6) * 0.045;
    if (deepWater.current) deepWater.current.position.y = -0.2 + Math.sin(elapsed * 0.45) * 0.025;
  });
  return (
    <group position={[0, 0, -105]}>
      <mesh ref={deepWater} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -380]}>
        <planeGeometry args={[1200, 900]} />
        <meshStandardMaterial color="#0b2948" roughness={0.16} metalness={0.72} transparent opacity={0.88} />
      </mesh>
      <mesh ref={nearShore} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 56]}>
        <planeGeometry args={[1200, 36]} />
        <meshStandardMaterial color="#18506d" roughness={0.28} metalness={0.5} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

export function Shoreline() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -29.5]} receiveShadow>
        <planeGeometry args={[1200, 6]} />
        <meshStandardMaterial color="#8d7042" roughness={1} />
      </mesh>
      <mesh position={[0, 0.34, -33]} castShadow receiveShadow>
        <boxGeometry args={[1200, 0.7, 1.3]} />
        <meshStandardMaterial color="#3d3930" roughness={0.96} />
      </mesh>
      <group position={[0, 0, -43]}>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[7, 0.55, 23]} />
          <meshStandardMaterial color="#573716" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export function Street() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[7.5, 80]} />
        <meshStandardMaterial color="#1c1408" roughness={0.94} />
      </mesh>
      {[-3.8, 3.8].map((sx, si) => Array.from({ length: 26 }, (_, i) => (
        <mesh key={`curb-${si}-${i}`} position={[sx, 0.06, -31 + i * 2.6]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.12, 2.3]} />
          <meshStandardMaterial color="#1e1810" roughness={0.95} />
        </mesh>
      )))}
      {BUILDINGS.map((b) => (
        <mesh key={`path-${b.id}`} rotation={[-Math.PI / 2, 0, 0]} position={[b.x < 0 ? -6.5 : 6.5, 0.008, b.z]} receiveShadow>
          <planeGeometry args={[5, b.d]} />
          <meshStandardMaterial color="#181410" roughness={0.97} />
        </mesh>
      ))}
    </>
  );
}

export function LanternPost({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 5.3, 8]} />
        <meshStandardMaterial color="#2a1808" roughness={0.88} metalness={0.15} />
      </mesh>
      <group position={[0.62, 5.35, 0]}>
        <mesh>
          <boxGeometry args={[0.32, 0.44, 0.32]} />
          <meshStandardMaterial color="#c9a84c" emissive="#c9a84c" emissiveIntensity={Math.max(0.7, intensity * 0.16)} transparent opacity={0.82} />
        </mesh>
        <pointLight intensity={intensity} distance={intensity >= 8 ? 20 : intensity >= 5 ? 17 : 12} color="#fbbf24" decay={2} />
      </group>
    </group>
  );
}

export function Fountain() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.6, 3, 0.5, 16]} />
        <meshStandardMaterial color="#2a1e12" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 24]} />
        <meshStandardMaterial color="#1a4060" emissive="#1a4060" emissiveIntensity={0.4} transparent opacity={0.8} />
      </mesh>
      <Sparkles count={30} scale={[3, 2, 3]} position={[0, 1.2, 0]} size={2} speed={0.8} color="#93c5fd" opacity={0.6} />
    </group>
  );
}

export function Trees() {
  const positions: [number, number, number, number][] = [[-24,0,-30,1.2],[-26,0,-10,1.1],[-24,0,12,1.3],[24,0,-30,1.1],[26,0,-10,1.2],[24,0,12,1.0],[-56,0,28,1.4],[56,0,30,1.5],[-50,0,42,1.1],[50,0,44,1.2],[0,0,-45,1.3],[18,0,-38,1.0],[-18,0,-38,1.1]];
  return (
    <>
      {positions.map(([x, , z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.28, 3, 7]} />
            <meshStandardMaterial color="#1a0e06" roughness={0.97} />
          </mesh>
          {[0, 1, 2].map((li) => (
            <mesh key={li} position={[0, 3.5 + li * 1.2, 0]} castShadow>
              <coneGeometry args={[1.6 - li * 0.35, 2.2, 7]} />
              <meshStandardMaterial color={`hsl(130,${28 + li * 6}%,${12 + li * 3}%)`} roughness={0.96} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

export function Ship({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const ship = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ship.current) return;
    const elapsed = clock.getElapsedTime() + position[0] * 0.03;
    ship.current.position.y = position[1] + Math.sin(elapsed * 0.55) * 0.18;
    ship.current.rotation.z = Math.sin(elapsed * 0.42) * 0.025;
  });
  return (
    <group ref={ship} position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[4.5, 1.8, 12]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[4, 0.3, 10]} />
        <meshStandardMaterial color="#8b6f47" roughness={0.85} />
      </mesh>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 9, 8]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 5.5, -1]} rotation={[0.3, 0, 0]}>
        <planeGeometry args={[3.5, 6]} />
        <meshStandardMaterial color="#f5f0d8" side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
