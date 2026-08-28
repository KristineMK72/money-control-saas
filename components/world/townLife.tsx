"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TOWN_NPCS, getNpcPosition, type TownNpc } from "@/lib/world/npcs";
import { AVATARS, type BuildingDef } from "./townConfig";

type CelebrationParticle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rotation: number; spin: number };

export function CelebrationParticles({ isMobile, onDone }: { isMobile: boolean; onDone: () => void }) {
  const bills = useRef<THREE.InstancedMesh>(null);
  const coins = useRef<THREE.InstancedMesh>(null);
  const startedAt = useRef<number | null>(null);
  const finished = useRef(false);
  const origin = useRef(new THREE.Vector3());
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = isMobile ? 14 : 24;
  const billTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#3f9b55"; context.fillRect(0, 0, 128, 64);
    context.strokeStyle = "#c9efb4"; context.lineWidth = 5; context.strokeRect(5, 5, 118, 54);
    context.fillStyle = "#e9ffd8"; context.font = "bold 38px Georgia"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText("$", 64, 34);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  const makeParticles = useCallback((): CelebrationParticle[] => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 8, y: 3.5 + Math.random() * 5, z: -2.5 - Math.random() * 5,
    vx: (Math.random() - 0.5) * 0.7, vy: -1.4 - Math.random() * 1.5, vz: (Math.random() - 0.5) * 0.35,
    rotation: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 5,
  })), [count]);
  const billParticles = useMemo(makeParticles, [makeParticles]);
  const coinParticles = useMemo(makeParticles, [makeParticles]);
  useEffect(() => () => billTexture?.dispose(), [billTexture]);
  useFrame(({ camera, clock }) => {
    if (!bills.current || !coins.current || finished.current) return;
    if (startedAt.current === null) { startedAt.current = clock.elapsedTime; origin.current.copy(camera.position); }
    const elapsed = clock.elapsedTime - startedAt.current;
    if (elapsed > 2.8) { finished.current = true; onDone(); return; }
    const update = (mesh: THREE.InstancedMesh, particle: CelebrationParticle, index: number, coin: boolean) => {
      dummy.position.set(origin.current.x + particle.x + particle.vx * elapsed + Math.sin(elapsed * 3 + index) * 0.15, origin.current.y + particle.y + particle.vy * elapsed, origin.current.z + particle.z + particle.vz * elapsed);
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(particle.rotation + particle.spin * elapsed);
      dummy.scale.setScalar(coin ? 0.72 + Math.abs(Math.sin(elapsed * 7 + index)) * 0.38 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    };
    billParticles.forEach((particle, index) => update(bills.current!, particle, index, false));
    coinParticles.forEach((particle, index) => update(coins.current!, particle, index, true));
    bills.current.instanceMatrix.needsUpdate = true;
    coins.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bills} args={[undefined, undefined, count]} frustumCulled={false}>
        <planeGeometry args={[0.72, 0.34]} />
        <meshBasicMaterial map={billTexture} color="#ffffff" side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coins} args={[undefined, undefined, count]} frustumCulled={false}>
        <circleGeometry args={[0.2, 12]} />
        <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

export function MobileTouchControls({ moveRef, yawRef }: { moveRef: React.MutableRefObject<{ f: number; r: number }>; yawRef: React.MutableRefObject<number> }) {
  const lStick = useRef<HTMLDivElement>(null);
  const lTouch = useRef<number | null>(null);
  const lOrigin = useRef({ x: 0, y: 0 });
  const rTouch = useRef<number | null>(null);
  const rLast = useRef({ x: 0, y: 0 });
  function onTouchStart(e: React.TouchEvent) {
    const mid = window.innerWidth / 2;
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < mid && lTouch.current === null) { lTouch.current = t.identifier; lOrigin.current = { x: t.clientX, y: t.clientY }; }
      else if (t.clientX >= mid && rTouch.current === null) { rTouch.current = t.identifier; rLast.current = { x: t.clientX, y: t.clientY }; }
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lTouch.current) {
        const dx = (t.clientX - lOrigin.current.x) / 45;
        const dy = (t.clientY - lOrigin.current.y) / 45;
        const len = Math.sqrt(dx * dx + dy * dy);
        const c = len > 1 ? 1 / len : 1;
        moveRef.current.r = Math.max(-1, Math.min(1, dx * c));
        moveRef.current.f = Math.max(-1, Math.min(1, -dy * c));
        if (lStick.current) lStick.current.style.transform = `translate(${Math.min(30, Math.max(-30, dx * 30))}px,${Math.min(30, Math.max(-30, dy * 30))}px)`;
      }
      if (t.identifier === rTouch.current) { yawRef.current -= (t.clientX - rLast.current.x) * 0.006; rLast.current = { x: t.clientX, y: t.clientY }; }
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lTouch.current) { moveRef.current.f = 0; moveRef.current.r = 0; lTouch.current = null; if (lStick.current) lStick.current.style.transform = "translate(0,0)"; }
      if (t.identifier === rTouch.current) rTouch.current = null;
    }
  }
  return (
    <div className="fixed inset-0 z-20 pointer-events-auto" style={{ touchAction: "none" }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="absolute bottom-24 left-8" style={{ width: 90, height: 90, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: "2px solid rgba(201,168,76,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div ref={lStick} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(201,168,76,0.6)", border: "2px solid rgba(201,168,76,0.9)", transition: "transform 0.04s ease", pointerEvents: "none" }} />
      </div>
      <div className="absolute bottom-24 right-8" style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 9, color: "rgba(201,168,76,0.35)", textAlign: "center", fontFamily: "EB Garamond, serif" }}>drag<br />to look</p>
      </div>
    </div>
  );
}

export function HumanFigure({ coatColor, skinColor, hatColor, waistcoatColor = "#6b351f", hairColor = "#d8d0bc", accentColor = "#d9b84a", name, nameColor = "#fbbf24", distanceFactor = 7 }: { coatColor: string; skinColor: string; hatColor: string; waistcoatColor?: string; hairColor?: string; accentColor?: string; name: string; nameColor?: string; distanceFactor?: number }) {
  return (
    <group>
      {[-0.1, 0.1].map((x) => (
        <group key={`leg-${x}`}>
          <mesh position={[x, 0.59, 0]} castShadow><cylinderGeometry args={[0.09, 0.08, 0.34, 10]} /><meshStandardMaterial color={waistcoatColor} roughness={0.86} /></mesh>
          <mesh position={[x, 0.29, 0]} castShadow><cylinderGeometry args={[0.076, 0.068, 0.34, 10]} /><meshStandardMaterial color="#eee7d5" roughness={0.82} /></mesh>
        </group>
      ))}
      <mesh position={[-0.1, 0.06, 0.04]} castShadow><boxGeometry args={[0.15, 0.12, 0.28]} /><meshStandardMaterial color="#0a0806" roughness={0.92} /></mesh>
      <mesh position={[0.1, 0.06, 0.04]} castShadow><boxGeometry args={[0.15, 0.12, 0.28]} /><meshStandardMaterial color="#0a0806" roughness={0.92} /></mesh>
      <mesh position={[0, 1.08, 0]} castShadow><boxGeometry args={[0.4, 0.6, 0.22]} /><meshStandardMaterial color={coatColor} roughness={0.82} /></mesh>
      <mesh position={[0, 1.08, 0.1]}><boxGeometry args={[0.22, 0.5, 0.04]} /><meshStandardMaterial color={waistcoatColor} roughness={0.78} /></mesh>
      <mesh position={[-0.26, 1.05, 0]} rotation={[0, 0, 0.18]} castShadow><cylinderGeometry args={[0.068, 0.055, 0.56, 8]} /><meshStandardMaterial color={coatColor} roughness={0.84} /></mesh>
      <mesh position={[0.26, 1.05, 0]} rotation={[0, 0, -0.18]} castShadow><cylinderGeometry args={[0.068, 0.055, 0.56, 8]} /><meshStandardMaterial color={coatColor} roughness={0.84} /></mesh>
      <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[0.195, 16, 16]} /><meshStandardMaterial color={skinColor} roughness={0.78} /></mesh>
      <mesh position={[0, 1.88, 0]}><cylinderGeometry args={[0.36, 0.36, 0.05, 3]} /><meshStandardMaterial color={hatColor} roughness={0.88} /></mesh>
      <mesh position={[0, 2.04, 0]}><cylinderGeometry args={[0.19, 0.22, 0.32, 12]} /><meshStandardMaterial color={hatColor} roughness={0.88} /></mesh>
      <Html position={[0, 2.55, 0]} center distanceFactor={distanceFactor} style={{ pointerEvents: "none" }}>
        <div style={{ background: "rgba(0,0,0,0.78)", color: nameColor, padding: "3px 9px", borderRadius: 7, fontSize: 11, fontFamily: "EB Garamond, serif", whiteSpace: "nowrap", border: "1px solid rgba(201,168,76,0.45)" }}>{name}</div>
      </Html>
    </group>
  );
}

export function CharacterBillboard({ npc }: { npc: TownNpc }) {
  const groupRef = useRef<THREE.Group>(null);
  const artRef = useRef<THREE.Group>(null);
  const texture = useTexture(npc.sprite);
  const aspect = 262 / 591;
  const height = 3.05 * npc.scale;
  const width = height * aspect;
  useEffect(() => { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 2; texture.needsUpdate = true; }, [texture]);
  useFrame(({ camera, clock }) => {
    if (!groupRef.current || !artRef.current) return;
    const position = getNpcPosition(npc, clock.elapsedTime);
    groupRef.current.position.x = position.x;
    groupRef.current.position.z = position.z;
    groupRef.current.lookAt(camera.position.x, groupRef.current.position.y + height * 0.48, camera.position.z);
    artRef.current.position.y = Math.sin(clock.elapsedTime * 2.1 + npc.phase) * 0.035;
  });
  return (
    <group ref={groupRef} position={npc.position}>
      <group ref={artRef} scale={[npc.flip ? -1 : 1, 1, 1]}>
        <mesh position={[0, height / 2, 0]} renderOrder={3}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.12} depthWrite side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      <Html position={[0, height + 0.28, 0]} center distanceFactor={npc.isBen ? 5 : 7} style={{ pointerEvents: "none" }}>
        <div style={{ background: "rgba(8,5,3,0.86)", color: npc.isBen ? "#fbbf24" : "#f5e6c8", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontFamily: "EB Garamond, serif", whiteSpace: "nowrap", border: "1px solid rgba(201,168,76,0.55)" }}>{npc.icon} {npc.name}</div>
      </Html>
    </group>
  );
}

export function TownLife() {
  return (
    <>
      {TOWN_NPCS.map((npc) => <CharacterBillboard key={npc.id} npc={npc} />)}
      <Wagon position={[2.8, 0, -2]} rotation={[0, -0.45, 0]} />
      <Horse position={[1.5, 0, -3.2]} rotation={[0, -0.45, 0]} />
    </>
  );
}

export function Horse({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[1.2, 0.52, 0.42]} /><meshStandardMaterial color="#3a2216" roughness={0.9} /></mesh>
      <mesh position={[0.55, 1.0, 0]} castShadow><boxGeometry args={[0.38, 0.3, 0.22]} /><meshStandardMaterial color="#3a2216" roughness={0.9} /></mesh>
      {[-0.38, 0.38].map((lx) => [-0.5, 0.5].map((lz) => (
        <mesh key={`${lx}-${lz}`} position={[lx, 0.3, lz * 0.7]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.62, 6]} /><meshStandardMaterial color="#2a1a0e" roughness={0.92} /></mesh>
      )))}
    </group>
  );
}

export function Wagon({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[1.4, 0.55, 0.85]} /><meshStandardMaterial color="#3a210e" roughness={0.9} /></mesh>
      {[-0.55, 0.55].map((x) => [-0.48, 0.48].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.035, 10, 20]} /><meshStandardMaterial color="#140b05" roughness={0.95} /></mesh>
      )))}
    </group>
  );
}

export function OtherPlayer({ x, z, yaw, avatarIdx, name }: { x: number; z: number; yaw: number; avatarIdx: number; name: string }) {
  const group = useRef<THREE.Group>(null);
  const av = AVATARS[avatarIdx] ?? AVATARS[0];
  useFrame(() => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, 0.12);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, z, 0.12);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, yaw, 0.12);
  });
  return (
    <group ref={group} position={[x, 0, z]}>
      <HumanFigure coatColor={av.coat} skinColor={av.skin} hatColor={av.hat} name={name} nameColor="#c9a84c" distanceFactor={8} />
    </group>
  );
}

export function EntryTransition({ building, onDone }: { building: BuildingDef; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: "radial-gradient(ellipse at center,rgba(0,0,0,.18) 0%,rgba(0,0,0,.98) 100%)" }}>
      <div style={{ fontSize: 78, marginBottom: 18 }}>{building.icon}</div>
      <h2 style={{ fontFamily: "EB Garamond, serif", color: "#c9a84c", fontSize: 30, fontWeight: "bold", letterSpacing: "0.12em", textAlign: "center", whiteSpace: "pre-line", marginBottom: 14 }}>{building.label}</h2>
      <p style={{ fontFamily: "EB Garamond, serif", color: "rgba(201,168,76,.55)", fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase" }}>Entering…</p>
    </div>
  );
}
