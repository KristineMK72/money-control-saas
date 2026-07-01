"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Sky,
  PointerLockControls,
  Html,
  Environment,
  Sparkles,
  Text,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import {
  useRef,
  useState,
  useEffect,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const BUILDINGS = [
  {
    id: "gov",
    href: "/dashboard",
    label: "Governor's\nOffice",
    icon: "🏛",
    x: -10,
    z: -16,
    w: 11,
    h: 9,
    d: 9,
    brick: "#3d2214",
    roof: "#1a1210",
    win: "#ffe066",
    enter: 12,
    collide: 6.5,
    pillars: true,
    large: true,
  },
  {
    id: "income",
    href: "/income",
    label: "Income\nLedger",
    icon: "📜",
    x: -10,
    z: -5,
    w: 8,
    h: 6,
    d: 7,
    brick: "#2e1a10",
    roof: "#16100a",
    win: "#6ee7b7",
    enter: 10,
    collide: 5,
    pillars: false,
    large: false,
  },
  {
    id: "bills",
    href: "/bills",
    label: "Post\nOffice",
    icon: "📋",
    x: -10,
    z: 6,
    w: 8,
    h: 6,
    d: 7,
    brick: "#2a180e",
    roof: "#161008",
    win: "#fdba74",
    enter: 10,
    collide: 5,
    pillars: false,
    large: false,
  },
  {
    id: "pay",
    href: "/payments",
    label: "Payment\nHall",
    icon: "🪙",
    x: -10,
    z: 17,
    w: 9,
    h: 7,
    d: 8,
    brick: "#281a0a",
    roof: "#12100a",
    win: "#fcd34d",
    enter: 10,
    collide: 5.5,
    pillars: true,
    large: false,
  },
  {
    id: "trophy",
    href: "/achievements",
    label: "Trophy\nRoom",
    icon: "🏆",
    x: 10,
    z: -16,
    w: 11,
    h: 9,
    d: 9,
    brick: "#2e0f0f",
    roof: "#160808",
    win: "#fca5a5",
    enter: 12,
    collide: 6.5,
    pillars: true,
    large: true,
  },
  {
    id: "obs",
    href: "/forecast",
    label: "Observatory",
    icon: "🔭",
    x: 10,
    z: -5,
    w: 8,
    h: 8,
    d: 8,
    brick: "#0e1a2e",
    roof: "#080e18",
    win: "#bfdbfe",
    enter: 10,
    collide: 5,
    pillars: false,
    large: false,
  },
  {
    id: "cal",
    href: "/calendar",
    label: "Town\nSquare",
    icon: "🗓️",
    x: 10,
    z: 6,
    w: 8,
    h: 6,
    d: 7,
    brick: "#201808",
    roof: "#100e04",
    win: "#c4b5fd",
    enter: 10,
    collide: 5,
    pillars: false,
    large: false,
  },
  {
    id: "set",
    href: "/settings",
    label: "Smithy",
    icon: "⚙️",
    x: 10,
    z: 17,
    w: 8,
    h: 6,
    d: 7,
    brick: "#181818",
    roof: "#0c0c0c",
    win: "#cbd5e1",
    enter: 10,
    collide: 5,
    pillars: false,
    large: false,
  },
] as const;

type BuildingDef = (typeof BUILDINGS)[number];

const AVATARS = [
  { color: "#8b1a1a", title: "Captain", hat: "#1a0a0a" },
  { color: "#1a3a6b", title: "Patriot", hat: "#0a0e1a" },
  { color: "#4a2e0e", title: "Merchant", hat: "#1a0f04" },
  { color: "#1a4a1a", title: "Ranger", hat: "#081408" },
  { color: "#1a1a1a", title: "Magistrate", hat: "#0a0a0a" },
  { color: "#4a1a6b", title: "Governor", hat: "#1a0824" },
];

const SPEED = 8;
const EYE_HEIGHT = 1.75;
const CHANNEL = "colonial-world-v2";

function playDoorSound() {
  try {
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const dist = ctx.createWaveShaper();
    const gain = ctx.createGain();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 300) * x) / (Math.PI + 300 * Math.abs(x));
    }
    dist.curve = curve;
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.7);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.75);
    osc.connect(dist);
    dist.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
  } catch {}
}

type PlayerState = {
  userId: string;
  username: string;
  avatarIdx: number;
  x: number;
  z: number;
  yaw: number;
};

function useMultiplayer(userId: string | null, username: string, avatarIdx: number) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [others, setOthers] = useState<Record<string, PlayerState>>({});
  const channelRef = useRef<any>(null);
  const lastBroadcast = useRef(0);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(CHANNEL);
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PlayerState>();
      const out: Record<string, PlayerState> = {};
      for (const [key, vals] of Object.entries(state)) {
        if (key !== userId && Array.isArray(vals) && vals[0]) {
          out[key] = vals[0] as PlayerState;
        }
      }
      setOthers(out);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ userId, username, avatarIdx, x: 0, z: 27, yaw: 0 });
      }
    });

    return () => { supabase.removeChannel(ch); };
  }, [userId, supabase, username, avatarIdx]);

  const broadcast = useCallback((x: number, z: number, yaw: number) => {
    if (!userId) return;
    const now = Date.now();
    if (now - lastBroadcast.current < 150) return;
    lastBroadcast.current = now;
    channelRef.current?.track({ userId, username, avatarIdx, x, z, yaw });
  }, [userId, username, avatarIdx]);

  return { others, broadcast };
}

export default function ColonialTown3D() {
  const router = useRouter();
  const moveRef = useRef({ f: 0, r: 0 });
  const mobileYaw = useRef(0);
  const controlsApiRef = useRef<any>(null);

  const [locked, setLocked] = useState(false);
  const [near, setNear] = useState<BuildingDef | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [entering, setEntering] = useState<BuildingDef | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("Colonist");
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [avatarPicked, setAvatarPicked] = useState(false);

  useEffect(() => {
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const saved = localStorage.getItem("colonial-avatar");
    if (saved !== null) {
      const parsed = Number.parseInt(saved, 10);
      setAvatarIdx(Number.isFinite(parsed) ? parsed : 0);
      setAvatarPicked(true);
    }
  }, []);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await sb.from("profiles").select("full_name, display_name").eq("user_id", user.id).maybeSingle();
      const name = data?.full_name || data?.display_name;
      if (name) setUsername(name.split(" ")[0]);
    })();
  }, []);

  const { others, broadcast } = useMultiplayer(userId, username, avatarIdx);

  const enter = useCallback(() => {
    if (!near || entering) return;
    setEntering(near);
    playDoorSound();
  }, [near, entering]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.code === "KeyE") enter(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [enter]);

  function pickAvatar(idx: number) {
    setAvatarIdx(idx);
    setAvatarPicked(true);
    localStorage.setItem("colonial-avatar", String(idx));
  }

  function startWorld() {
    if (!avatarPicked) return;
    if (isMobile) { setLocked(true); return; }
    controlsApiRef.current?.lock?.();
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas
        camera={{ fov: 72, near: 0.1, far: 500, position: [0, EYE_HEIGHT, 27] }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
      >
        <Suspense fallback={null}>
          <Scene
            moveRef={moveRef}
            mobileYaw={mobileYaw}
            isMobile={isMobile}
            nearId={near?.id ?? null}
            onNear={setNear}
            onLock={setLocked}
            onControlsReady={(controls) => { controlsApiRef.current = controls; }}
            others={others}
            broadcast={broadcast}
          />

          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.9} intensity={1.4} mipmapBlur />
            <Vignette offset={0.3} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* UI Overlays (unchanged) */}
      {!locked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          {/* ... your avatar picker UI ... */}
        </div>
      )}

      {(locked || isMobile) && near && !entering && (
        <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4">
          <button onClick={enter} className="font-cinzel rounded-2xl px-8 py-4 text-base font-bold" style={{ background: "rgba(201,168,76,0.98)", color: "#1a0f0a" }}>
            {near.icon} Enter {near.label.replace("\n", " ")}
          </button>
        </div>
      )}

      {/* ... other UI elements (online count, crosshair, etc.) ... */}

      {entering && <EntryTransition building={entering} onDone={() => { router.push(entering.href); setEntering(null); }} />}
    </div>
  );
}

function Scene({ moveRef, mobileYaw, isMobile, nearId, onNear, onLock, onControlsReady, others, broadcast }: any) {
  const controlsRef = useRef<any>(null);
  const nearestRef = useRef<BuildingDef | null>(null);

  // ... existing useEffect and useFrame logic for movement and near detection (unchanged) ...

  return (
    <>
      <Sky distance={4500} sunPosition={[60, 8, -80]} inclination={0.52} azimuth={0.22} turbidity={8} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.82} />
      <Environment preset="sunset" background={false} />
      <fog attach="fog" args={["#1a0f06", 40, 200]} />

      <ambientLight intensity={1.6} color="#ffe0b0" />
      <directionalLight position={[50, 80, -60]} intensity={3.8} color="#ffcc88" castShadow shadow-mapSize={[4096, 4096]} shadow-camera-near={1} shadow-camera-far={200} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-bias={-0.001} />
      <hemisphereLight args={["#6a4a2a", "#1a1008", 1.8]} />

      <Sparkles count={120} scale={[30, 8, 50]} position={[0, 2, 0]} size={1.5} speed={0.3} color="#fbbf24" opacity={0.5} />

      <Ground />
      <Street />

      {BUILDINGS.map((b) => (
        <Building key={b.id} def={b} active={nearId === b.id} />
      ))}

      {[-18, -10, -2, 8, 18].map((z) => (
        <group key={`lantern-row-${z}`}>
          <LanternPost position={[-3.8, 0, z]} />
          <LanternPost position={[3.8, 0, z]} />
        </group>
      ))}

      <Fountain />
      <BenNPC position={[0, 0, 4]} />
      <ColonialTrees />

      {Object.entries(others).map(([id, p]) => (
        <OtherPlayer key={id} x={p.x} z={p.z} yaw={p.yaw} avatarIdx={p.avatarIdx ?? 0} name={p.username ?? "Colonist"} />
      ))}

      {!isMobile && <PointerLockControls ref={controlsRef} />}
    </>
  );
}

/* ====================== COLONIAL SIGN ====================== */
function ColonialSign({ label, icon, position, active }: { label: string; icon: string; position: [number, number, number]; active: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const signRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.85) * 0.042;
    if (active && signRef.current) signRef.current.scale.setScalar(1 + Math.sin(t * 2.8) * 0.007);
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, 0.68, -0.1]} castShadow><boxGeometry args={[2.6, 0.12, 0.12]} /><meshStandardMaterial color="#1c140f" metalness={0.8} roughness={0.28} /></mesh>
      <mesh position={[0, 0.65, -0.19]} castShadow><boxGeometry args={[0.22, 1.1, 0.1]} /><meshStandardMaterial color="#17120c" metalness={0.75} roughness={0.35} /></mesh>

      <Chain position={[-0.85, 0.25, -0.06]} />
      <Chain position={[0.85, 0.25, -0.06]} />

      <mesh ref={signRef} position={[0, -0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.12, 0.96, 0.15]} />
        <meshStandardMaterial color={active ? "#5c2e12" : "#3a210e"} roughness={0.68} metalness={0.04} emissive={active ? "#3a210e" : "#000"} emissiveIntensity={active ? 0.4 : 0} />
      </mesh>

      <mesh position={[0, -0.22, 0.085]} castShadow>
        <boxGeometry args={[2.3, 1.1, 0.055]} />
        <meshStandardMaterial color={active ? "#e8b94f" : "#9a6a2f"} metalness={0.75} roughness={0.38} />
      </mesh>

      <mesh position={[0, -0.22, 0.13]} castShadow>
        <boxGeometry args={[1.9, 0.8, 0.06]} />
        <meshStandardMaterial color={active ? "#2c1708" : "#1f1207"} roughness={0.78} />
      </mesh>

      {active && <pointLight position={[0, 0.2, 0.95]} intensity={7} distance={7} color="#ffcc77" decay={1.7} />}

      <Text position={[0, 0.04, 0.18]} fontSize={0.27} anchorX="center" anchorY="middle" color="#ffe8a3" outlineWidth={0.02} outlineColor="#1a1208">{icon}</Text>
      <Text position={[0, -0.28, 0.18]} fontSize={0.145} maxWidth={1.72} textAlign="center" anchorX="center" anchorY="middle" color={active ? "#fff9d8" : "#f0c96a"} outlineWidth={0.022} outlineColor="#0f0a05" lineHeight={1.1}>
        {label.toUpperCase().replace(/ /g, "\n")}
      </Text>
    </group>
  );
}

function Chain({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, -i * 0.136, 0]} rotation={[0, 0, (i % 2) * 0.78 - 0.38]} castShadow>
          <torusGeometry args={[0.05, 0.009, 10, 16]} />
          <meshStandardMaterial color="#1a140d" metalness={0.82} roughness={0.32} />
        </mesh>
      ))}
    </group>
  );
}

/* ====================== BUILDING ====================== */
function Building({ def, active }: { def: BuildingDef; active: boolean }) {
  const { x, z, w, h, d, brick, roof, win, label, icon, pillars, large } = def;
  const left = x < 0;
  const fz = left ? d / 2 : -(d / 2);
  const fDir = left ? 1 : -1;

  return (
    <group position={[x, 0, z]}>
      {/* All your original building geometry stays here (base, walls, roof, windows, door, pillars, lights, etc.) */}
      {/* ... (keep everything from your original Building function) ... */}

      {/* NEW 3D SIGN */}
      <ColonialSign label={label} icon={icon} position={[0, h * 0.68 + 0.44, fz + fDir * 0.55]} active={active} />
    </group>
  );
}

/* ====================== BEN NPC (updated) ====================== */
function BenNPC({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 1.8) * 0.025;
    group.current.rotation.y = Math.sin(t * 0.6) * 0.22;
  });

  return (
    <group ref={group} position={position}>
      {/* Legs + Sneakers */}
      {[-0.13, 0.13].map((x, i) => (
        <group key={i} position={[x, 0.45, 0]}>
          <mesh><cylinderGeometry args={[0.07, 0.07, 0.9, 8]} /><meshStandardMaterial color="#1b1b2f" roughness={0.85} /></mesh>
          <mesh position={[0, -0.52, 0.05]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.16, 0.1, 0.28]} />
            <meshStandardMaterial color="#111" roughness={0.6} metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Green Coat */}
      <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[0.29, 0.23, 0.95, 12]} /><meshStandardMaterial color="#1e5c2e" roughness={0.75} /></mesh>

      {/* Brown Vest */}
      <mesh position={[0, 1.12, 0.18]}><boxGeometry args={[0.27, 0.6, 0.08]} /><meshStandardMaterial color="#8b5a2b" roughness={0.8} /></mesh>

      {/* Cravat */}
      <mesh position={[0, 1.48, 0.22]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#f8f1df" roughness={0.6} /></mesh>

      {/* Head */}
      <mesh position={[0, 1.72, 0]}><sphereGeometry args={[0.24, 20, 20]} /><meshStandardMaterial color="#e0c090" roughness={0.75} /></mesh>

      {/* Hair */}
      <mesh position={[0, 1.78, -0.05]}><sphereGeometry args={[0.26, 16, 16]} /><meshStandardMaterial color="#d4c8b0" roughness={0.9} /></mesh>

      {/* Dollar Sunglasses */}
      <group position={[0, 1.72, 0.22]}>
        <mesh><boxGeometry args={[0.28, 0.08, 0.08]} /><meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} /></mesh>
        {[-0.09, 0.09].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 16]} rotation={[1.6, 0, 0]} />
            <meshStandardMaterial color="#111" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* Tablet */}
      <group position={[-0.35, 1.45, 0.35]} rotation={[0.4, 0.6, 0]}>
        <mesh><boxGeometry args={[0.45, 0.32, 0.04]} /><meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[0, 0, 0.022]}><planeGeometry args={[0.4, 0.27]} /><meshStandardMaterial color="#0a0f1a" emissive="#00ff88" emissiveIntensity={0.3} /></mesh>
      </group>

      {/* Hat */}
      <mesh position={[0, 2.0, 0]}><cylinderGeometry args={[0.38, 0.38, 0.05, 20]} /><meshStandardMaterial color="#1b1510" roughness={0.9} /></mesh>
      <mesh position={[0, 2.18, 0]}><cylinderGeometry args={[0.21, 0.25, 0.35, 14]} /><meshStandardMaterial color="#1b1510" roughness={0.9} /></mesh>

      <Html position={[0, 2.8, 0]} center distanceFactor={5}>
        <div style={{ background: "rgba(0,0,0,0.8)", color: "#fbbf24", padding: "6px 12px", borderRadius: 8, fontSize: 15, fontFamily: "EB Garamond, serif", border: "1px solid #c9a84c" }}>Ben</div>
      </Html>
    </group>
  );
}

/* Keep all your other functions: Ground, Street, LanternPost, Fountain, ColonialTrees, OtherPlayer, MobileControls, EntryTransition exactly as they were in the pasted file. */
