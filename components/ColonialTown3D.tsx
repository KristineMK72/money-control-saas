"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sparkles, Text } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";

const SPEED = 10;
const EYE_HEIGHT = 1.75;
const START_POS: [number, number, number] = [0, 34, 44];
const FIRST_PERSON_POS: [number, number, number] = [0, EYE_HEIGHT, 27];

const BUILDINGS = [
  { id: "gov",    href: "/dashboard",    label: "Governor's\nOffice", icon: "🏛",  x: -10, z: -16, w: 10, h: 7,   d: 9, brick: "#7a4a2a", roof: "#3a2418", win: "#ffe066", enter: 12 },
  { id: "income", href: "/income",       label: "Income\nLedger",     icon: "📜",  x: -10, z:  -5, w:  7, h: 5,   d: 7, brick: "#6b3d1e", roof: "#2e1a10", win: "#6ee7b7", enter: 10 },
  { id: "bills",  href: "/bills",        label: "Post\nOffice",       icon: "📬",  x: -10, z:   6, w:  7, h: 5,   d: 7, brick: "#8a5530", roof: "#3a2218", win: "#fdba74", enter: 10 },
  { id: "pay",    href: "/payments",     label: "Payment\nHall",      icon: "🪙",  x: -10, z:  17, w:  8, h: 5.5, d: 8, brick: "#7d4a18", roof: "#2e1e0a", win: "#fcd34d", enter: 10 },
  { id: "trophy", href: "/achievements", label: "Trophy\nRoom",       icon: "🏆",  x:  10, z: -16, w: 10, h: 7,   d: 9, brick: "#8a3a28", roof: "#3a1810", win: "#fca5a5", enter: 12 },
  { id: "obs",    href: "/forecast",     label: "Observatory",        icon: "🔭",  x:  10, z:  -5, w:  7, h: 6,   d: 7, brick: "#2a5280", roof: "#142840", win: "#bfdbfe", enter: 10 },
  { id: "cal",    href: "/calendar",     label: "Town\nHall",         icon: "🗓️", x:  10, z:   6, w:  7, h: 5,   d: 7, brick: "#6a5020", roof: "#2e2410", win: "#c4b5fd", enter: 10 },
  { id: "set",    href: "/settings",     label: "Smithy",             icon: "⚙️", x:  10, z:  17, w:  7, h: 5,   d: 7, brick: "#504848", roof: "#201c1c", win: "#cbd5e1", enter: 10 },
] as const;

type BuildingDef = (typeof BUILDINGS)[number];

function isBlocked(px: number, pz: number) {
  return BUILDINGS.some((b) => Math.abs(px - b.x) < b.w / 2 + 1 && Math.abs(pz - b.z) < b.d / 2 + 1);
}

export default function ColonialTown3D() {
  const router = useRouter();
  const moveRef = useRef({ f: 0, r: 0 });
  const [locked, setLocked] = useState(false);
  const [near, setNear] = useState<BuildingDef | null>(null);
  const [entering, setEntering] = useState<BuildingDef | null>(null);

  const interact = useCallback(() => {
    if (!near || entering) return;
    setEntering(near);
  }, [near, entering]);

  useEffect(() => {
    const keys: Record<string, boolean> = {};
    const sync = () => {
      moveRef.current.f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      moveRef.current.r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      keys[e.code] = true;
      sync();
      if (e.code === "KeyE") interact();
    };
    const up = (e: KeyboardEvent) => {
      keys[e.code] = false;
      sync();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [interact]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas camera={{ fov: 72, near: 0.1, far: 900, position: START_POS }} gl={{ antialias: false }}>
        <Suspense fallback={null}>
          <Scene locked={locked} moveRef={moveRef} nearId={near?.id ?? null} onNear={setNear} onLock={setLocked} />
        </Suspense>
      </Canvas>
      {!locked && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/20 px-4 pb-10">
          <button
            type="button"
            onClick={() => setLocked(true)}
            className="font-cinzel rounded-2xl px-8 py-4 text-base font-bold"
            style={{ background: "#c9a84c", color: "#1a0f0a" }}
          >
            Enter Franklin's Landing
          </button>
        </div>
      )}
      {locked && near && !entering && (
        <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4">
          <button
            type="button"
            onClick={interact}
            className="font-cinzel rounded-2xl px-8 py-4 text-base font-bold"
            style={{ background: "rgba(201,168,76,0.98)", color: "#1a0f0a" }}
          >
            {near.icon} Enter {near.label.replace("\n", " ")} — Press E
          </button>
        </div>
      )}
      {entering && (
        <EntryOverlay
          building={entering}
          onDone={() => {
            router.push(entering.href);
            setEntering(null);
          }}
        />
      )}
    </div>
  );
}

function Scene({
  locked,
  moveRef,
  nearId,
  onNear,
  onLock,
}: {
  locked: boolean;
  moveRef: React.MutableRefObject<{ f: number; r: number }>;
  nearId: string | null;
  onNear: (b: BuildingDef | null) => void;
  onLock: (v: boolean) => void;
}) {
  const controlsRef = useRef<any>(null);
  const nearestRef = useRef<BuildingDef | null>(null);
  const introDone = useRef(false);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...START_POS);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const lock = () => onLock(true);
    const unlock = () => onLock(false);
    c.addEventListener("lock", lock);
    c.addEventListener("unlock", unlock);
    return () => {
      c.removeEventListener("lock", lock);
      c.removeEventListener("unlock", unlock);
    };
  }, [onLock]);

  useFrame((state, delta) => {
    const cam = state.camera;
    const dt = Math.min(delta, 0.05);
    if (!locked) {
      cam.position.lerp(new THREE.Vector3(0, 70, 70), 0.04);
      cam.lookAt(0, 0, 0);
      return;
    }
    if (!introDone.current && cam.position.y > EYE_HEIGHT + 0.08) {
      const target = new THREE.Vector3(...FIRST_PERSON_POS);
      cam.position.lerp(target, 0.035);
      cam.lookAt(0, 1.4, 0);
      if (cam.position.distanceTo(target) < 0.2) {
        introDone.current = true;
        cam.position.set(...FIRST_PERSON_POS);
      }
      return;
    }
    const { f, r } = moveRef.current;
    if (f !== 0 || r !== 0) {
      const yaw = cam.rotation.y;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const rgt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const dir = new THREE.Vector3().addScaledVector(fwd, f).addScaledVector(rgt, r).normalize().multiplyScalar(SPEED * dt);
      const next = cam.position.clone().add(dir);
      if (!isBlocked(next.x, next.z) && next.x > -85 && next.x < 85 && next.z > -95 && next.z < 85) {
        cam.position.x = next.x;
        cam.position.z = next.z;
      }
    }
    cam.position.y = EYE_HEIGHT;
    let found: BuildingDef | null = null;
    let best = Infinity;
    for (const b of BUILDINGS) {
      const dist = Math.hypot(cam.position.x - b.x, cam.position.z - b.z);
      if (dist < b.enter && dist < best) {
        found = b;
        best = dist;
      }
    }
    if (nearestRef.current?.id !== found?.id) {
      nearestRef.current = found;
      onNear(found);
    }
  });

  return (
    <>
      <color attach="background" args={["#78a9cc"]} />
      <ambientLight intensity={1.4} color="#fff4da" />
      <directionalLight position={[45, 85, -35]} intensity={3.4} color="#fff1c2" />
      <hemisphereLight args={["#bfe1f2", "#403426", 1.4]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#1c1408" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[7.5, 80]} />
        <meshStandardMaterial color="#2a2010" />
      </mesh>
      {BUILDINGS.map((b) => (
        <Building key={b.id} def={b} active={nearId === b.id} />
      ))}
      <PointerLockControls ref={controlsRef} />
    </>
  );
}

function Building({ def, active }: { def: BuildingDef; active: boolean }) {
  const { x, z, w, h, d, brick, roof, win, label, icon } = def;
  const left = x < 0;
  const streetRotY = left ? Math.PI / 2 : -Math.PI / 2;
  const signX = left ? w / 2 + 0.16 : -(w / 2 + 0.16);
  const postX = left ? w / 2 + 1.6 : -(w / 2 + 1.6);

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={brick} roughness={0.82} />
      </mesh>
      <mesh position={[0, h + 0.8, 0]}>
        <boxGeometry args={[w + 0.8, 1.6, d + 0.8]} />
        <meshStandardMaterial color={roof} roughness={0.92} />
      </mesh>
      <mesh position={[left ? w / 2 + 0.05 : -(w / 2 + 0.05), 1.4, 0]}>
        <boxGeometry args={[0.12, 2.4, 1.2]} />
        <meshStandardMaterial color="#3d1a08" />
      </mesh>
      <pointLight position={[left ? 2.4 : -2.4, 2.4, 0]} intensity={active ? 6 : 2.5} distance={10} color={win} />
      {active && (
        <Sparkles count={24} scale={[2.4, 2.2, 1.4]} position={[left ? w / 2 + 1.2 : -(w / 2 + 1.2), 2, 0]} color="#fbbf24" />
      )}
      <group position={[signX, h * 0.62, 0]} rotation={[0, streetRotY, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.1, 0.9, 0.12]} />
          <meshStandardMaterial color={active ? "#6b3818" : "#4a2a12"} />
        </mesh>
        <Text position={[0, 0.12, 0.1]} fontSize={0.26} anchorX="center" anchorY="middle" color="#ffe8a3">
          {icon}
        </Text>
        <Text position={[0, -0.22, 0.1]} fontSize={0.13} maxWidth={1.7} textAlign="center" anchorX="center" anchorY="middle" color="#f0c96a">
          {label.toUpperCase().replace(/ /g, "\n")}
        </Text>
      </group>
      <group position={[postX, 0, 0]} rotation={[0, streetRotY, 0]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 2.2, 8]} />
          <meshStandardMaterial color="#3a2010" />
        </mesh>
        <mesh position={[0, 1.68, 0.06]}>
          <boxGeometry args={[1.5, 0.58, 0.1]} />
          <meshStandardMaterial color={active ? "#7a4020" : "#5a3018"} />
        </mesh>
        <Text position={[0, 1.68, 0.14]} fontSize={0.12} maxWidth={1.3} textAlign="center" anchorX="center" anchorY="middle" color="#ffe8a3">
          {`${icon} ${label.replace("\n", " ").toUpperCase()}`}
        </Text>
      </group>
    </group>
  );
}

function EntryOverlay({ building, onDone }: { building: BuildingDef; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
      <div style={{ fontSize: 64 }}>{building.icon}</div>
      <h2 className="font-cinzel text-2xl font-bold text-[#c9a84c]">{building.label}</h2>
    </div>
  );
}
