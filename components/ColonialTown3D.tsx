"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Sky,
  PointerLockControls,
  Html,
  Environment,
  Sparkles,
  Text,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SPEED = 10;
const EYE_HEIGHT = 1.75;
const START_POS: [number, number, number] = [0, 34, 44];
const FIRST_PERSON_POS: [number, number, number] = [0, EYE_HEIGHT, 27];
const CHANNEL = "franklins-landing-v4";

// Lighter brick colors + slightly reduced heights so buildings feel approachable
const BUILDINGS = [
  { id: "gov",    href: "/dashboard",    label: "Governor's\nOffice", icon: "🏛",  x: -10, z: -16, w: 10, h: 7,   d: 9, brick: "#7a4a2a", roof: "#3a2418", win: "#ffe066", enter: 12, pillars: true,  large: true  },
  { id: "income", href: "/income",       label: "Income\nLedger",     icon: "📜",  x: -10, z:  -5, w:  7, h: 5,   d: 7, brick: "#6b3d1e", roof: "#2e1a10", win: "#6ee7b7", enter: 10, pillars: false, large: false },
  { id: "bills",  href: "/bills",        label: "Post\nOffice",       icon: "📬",  x: -10, z:   6, w:  7, h: 5,   d: 7, brick: "#8a5530", roof: "#3a2218", win: "#fdba74", enter: 10, pillars: false, large: false },
  { id: "pay",    href: "/payments",     label: "Payment\nHall",      icon: "🪙",  x: -10, z:  17, w:  8, h: 5.5, d: 8, brick: "#7d4a18", roof: "#2e1e0a", win: "#fcd34d", enter: 10, pillars: true,  large: false },
  { id: "trophy", href: "/achievements", label: "Trophy\nRoom",       icon: "🏆",  x:  10, z: -16, w: 10, h: 7,   d: 9, brick: "#8a3a28", roof: "#3a1810", win: "#fca5a5", enter: 12, pillars: true,  large: true  },
  { id: "obs",    href: "/forecast",     label: "Observatory",        icon: "🔭",  x:  10, z:  -5, w:  7, h: 6,   d: 7, brick: "#2a5280", roof: "#142840", win: "#bfdbfe", enter: 10, pillars: false, large: false },
  { id: "cal",    href: "/calendar",     label: "Town\nHall",         icon: "🗓️", x:  10, z:   6, w:  7, h: 5,   d: 7, brick: "#6a5020", roof: "#2e2410", win: "#c4b5fd", enter: 10, pillars: false, large: false },
  { id: "set",    href: "/settings",     label: "Smithy",             icon: "⚙️", x:  10, z:  17, w:  7, h: 5,   d: 7, brick: "#504848", roof: "#201c1c", win: "#cbd5e1", enter: 10, pillars: false, large: false },
] as const;

type BuildingDef = (typeof BUILDINGS)[number];

const AVATARS = [
  { coat: "#8b1a1a", hat: "#1a0a0a", skin: "#d4a876" },
  { coat: "#1a3a6b", hat: "#0a0e1a", skin: "#c49060" },
  { coat: "#4a2e0e", hat: "#1a0f04", skin: "#d4a876" },
  { coat: "#1a4a1a", hat: "#081408", skin: "#a87040" },
  { coat: "#2a1a4a", hat: "#0a0818", skin: "#d4a876" },
  { coat: "#4a1a6b", hat: "#1a0824", skin: "#b08050" },
];

type PlayerState = {
  userId: string;
  username: string;
  avatarIdx: number;
  x: number;
  z: number;
  yaw: number;
};

function playDoorSound() {
  try {
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.65);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {}
}

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

  const broadcast = useCallback(
    (x: number, z: number, yaw: number) => {
      if (!userId) return;
      const now = Date.now();
      if (now - lastBroadcast.current < 150) return;
      lastBroadcast.current = now;
      channelRef.current?.track({ userId, username, avatarIdx, x, z, yaw });
    },
    [userId, username, avatarIdx]
  );

  return { others, broadcast };
}

// ── AABB collision — much more accurate than circle, lets you walk around buildings ──
function isBlockedByBuilding(px: number, pz: number): boolean {
  const margin = 1.0;
  return BUILDINGS.some((b) => {
    return (
      Math.abs(px - b.x) < b.w / 2 + margin &&
      Math.abs(pz - b.z) < b.d / 2 + margin
    );
  });
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

  useEffect(() => {
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const saved = localStorage.getItem("colonial-avatar");
    if (saved !== null) {
      const parsed = Number.parseInt(saved, 10);
      setAvatarIdx(Number.isFinite(parsed) ? parsed : 0);
    }
  }, []);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await sb
        .from("profiles")
        .select("full_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
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

  function startWorld() {
    setLocked(true);
    if (isMobile) return;
    setTimeout(() => { controlsApiRef.current?.lock?.(); }, 150);
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas
        camera={{ fov: 72, near: 0.1, far: 900, position: START_POS }}
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.35,
        }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
      >
        <Suspense fallback={null}>
          <Scene
            locked={locked}
            moveRef={moveRef}
            mobileYaw={mobileYaw}
            isMobile={isMobile}
            nearId={near?.id ?? null}
            onNear={setNear}
            onLock={setLocked}
            onControlsReady={(controls: any) => { controlsApiRef.current = controls; }}
            others={others}
            broadcast={broadcast}
          />
          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.9} intensity={1.2} mipmapBlur />
            <Vignette offset={0.25} darkness={0.58} blendFunction={BlendFunction.NORMAL} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {!locked && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/20 px-4 pb-10">
          <div className="text-center">
            <div
              className="mb-3 rounded-3xl px-5 py-4"
              style={{
                background: "rgba(8,4,2,0.72)",
                border: "1px solid rgba(201,168,76,0.45)",
                color: "#f5e6c8",
                fontFamily: "EB Garamond, serif",
                boxShadow: "0 0 40px rgba(0,0,0,.45)",
              }}
            >
              <p className="font-cinzel text-xs uppercase tracking-[0.3em]" style={{ color: "#c9a84c" }}>
                Bird&apos;s-Eye View
              </p>
              <h2 className="mt-1 text-2xl font-bold">Franklin&apos;s Landing</h2>
              <p className="mt-1 text-sm text-[#d6c09a]">Survey the colony, then enter the streets.</p>
            </div>
            <button
              type="button"
              onClick={startWorld}
              className="font-cinzel rounded-2xl px-8 py-4 text-base font-bold transition-all active:scale-95"
              style={{
                background: "#c9a84c",
                color: "#1a0f0a",
                boxShadow: "0 0 34px rgba(201,168,76,0.7)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            >
              Enter Franklin&apos;s Landing
            </button>
          </div>
        </div>
      )}

      {(locked || isMobile) && near && !entering && (
        <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4">
          <button
            type="button"
            onClick={enter}
            className="font-cinzel rounded-2xl px-8 py-4 text-base font-bold transition-transform active:scale-95"
            style={{
              background: "rgba(201,168,76,0.98)",
              color: "#1a0f0a",
              boxShadow: "0 0 30px rgba(201,168,76,0.75)",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            {near.icon} Enter {near.label.replace("\n", " ")}
            {!isMobile ? " — Press E" : ""}
          </button>
        </div>
      )}

      {(locked || isMobile) && !entering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "rgba(201,168,76,0.8)",
              boxShadow: "0 0 8px rgba(201,168,76,0.6)",
            }}
          />
        </div>
      )}

      {isMobile && locked && !entering && (
        <MobileTouchControls moveRef={moveRef} yawRef={mobileYaw} />
      )}

      {entering && (
        <EntryTransition
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
  mobileYaw,
  isMobile,
  nearId,
  onNear,
  onLock,
  onControlsReady,
  others,
  broadcast,
}: {
  locked: boolean;
  moveRef: React.MutableRefObject<{ f: number; r: number }>;
  mobileYaw: React.MutableRefObject<number>;
  isMobile: boolean;
  nearId: string | null;
  onNear: (b: BuildingDef | null) => void;
  onLock: (v: boolean) => void;
  onControlsReady: (controls: any) => void;
  others: Record<string, PlayerState>;
  broadcast: (x: number, z: number, yaw: number) => void;
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
    if (isMobile || !controlsRef.current) return;
    const c = controlsRef.current;
    onControlsReady(c);
    const lock = () => onLock(true);
    const unlock = () => onLock(false);
    c.addEventListener("lock", lock);
    c.addEventListener("unlock", unlock);
    return () => {
      c.removeEventListener("lock", lock);
      c.removeEventListener("unlock", unlock);
    };
  }, [isMobile, onControlsReady, onLock]);

  useEffect(() => {
    const keys: Record<string, boolean> = {};
    function sync() {
      moveRef.current.f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      moveRef.current.r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    }
    const down = (e: KeyboardEvent) => { keys[e.code] = true; sync(); };
    const up = (e: KeyboardEvent) => { keys[e.code] = false; sync(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [moveRef]);

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
    if (isMobile) {
      cam.rotation.order = "YXZ";
      cam.rotation.y = mobileYaw.current;
    }

    if (f !== 0 || r !== 0) {
      const yaw = cam.rotation.y;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const rgt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const dir = new THREE.Vector3()
        .addScaledVector(fwd, f)
        .addScaledVector(rgt, r)
        .normalize()
        .multiplyScalar(SPEED * dt);

      const next = cam.position.clone().add(dir);

      // AABB collision — accurate rectangular footprint per building
      const blockedByBuilding = isBlockedByBuilding(next.x, next.z);
      const outOfBounds = next.x < -85 || next.x > 85 || next.z < -95 || next.z > 85;

      if (!blockedByBuilding && !outOfBounds) {
        cam.position.x = next.x;
        cam.position.z = next.z;
      } else {
        // Try sliding along each axis separately so you can slide around corners
        const slideX = cam.position.clone();
        slideX.x = next.x;
        if (!isBlockedByBuilding(slideX.x, slideX.z) && slideX.x > -85 && slideX.x < 85) {
          cam.position.x = slideX.x;
        }
        const slideZ = cam.position.clone();
        slideZ.z = next.z;
        if (!isBlockedByBuilding(slideZ.x, slideZ.z) && slideZ.z > -95 && slideZ.z < 85) {
          cam.position.z = slideZ.z;
        }
      }
    }

    cam.position.y = EYE_HEIGHT;
    broadcast(cam.position.x, cam.position.z, cam.rotation.y);

    let found: BuildingDef | null = null;
    let best = Infinity;
    for (const b of BUILDINGS) {
      const dx = cam.position.x - b.x;
      const dz = cam.position.z - b.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
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
      <Sky distance={4500} sunPosition={[80, 60, -100]} inclination={0.45} azimuth={0.9} turbidity={6} rayleigh={0.8} mieCoefficient={0.005} />
      <Environment preset="sunset" background={false} />
      <fog attach="fog" args={["#1a0f06", 60, 360]} />

      <ambientLight intensity={1.8} color="#ffe0b0" />
      <directionalLight
        position={[50, 80, -60]}
        intensity={4.2}
        color="#ffcc88"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-near={1}
        shadow-camera-far={240}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.001}
      />
      <hemisphereLight args={["#6a4a2a", "#1a1008", 1.8]} />

      <Sparkles count={170} scale={[72, 12, 96]} position={[0, 2, 0]} size={1.5} speed={0.3} color="#fbbf24" opacity={0.38} />

      <InfiniteTerrain />
      <HarborWater />
      <Street />

      {BUILDINGS.map((b) => (
        <Building key={b.id} def={b} active={nearId === b.id} />
      ))}

      {[-22, -14, -6, 2, 10, 18, 26].map((z) => (
        <group key={`lantern-row-${z}`}>
          <LanternPost position={[-3.8, 0, z]} />
          <LanternPost position={[3.8, 0, z]} />
        </group>
      ))}

      <Fountain />
      <BenNPC position={[0, 0, 4]} />
      <TownLife />
      <Trees />

      <Ship position={[-35, 0, -95]} rotation={0.4} />
      <Ship position={[25, 0, -110]} rotation={-0.6} />
      <Ship position={[-50, 0, -125]} rotation={0.2} />
      <Ship position={[45, 0, -135]} rotation={0.8} />

      {Object.entries(others).map(([id, p]) => (
        <OtherPlayer key={id} x={p.x} z={p.z} yaw={p.yaw} avatarIdx={p.avatarIdx ?? 0} name={p.username ?? "Colonist"} />
      ))}

      {!isMobile && <PointerLockControls ref={controlsRef} />}
    </>
  );
}

function MobileTouchControls({
  moveRef,
  yawRef,
}: {
  moveRef: React.MutableRefObject<{ f: number; r: number }>;
  yawRef: React.MutableRefObject<number>;
}) {
  const lStick = useRef<HTMLDivElement>(null);
  const lTouch = useRef<number | null>(null);
  const lOrigin = useRef({ x: 0, y: 0 });
  const rTouch = useRef<number | null>(null);
  const rLast = useRef({ x: 0, y: 0 });

  function onTouchStart(e: React.TouchEvent) {
    const mid = window.innerWidth / 2;
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < mid && lTouch.current === null) {
        lTouch.current = t.identifier;
        lOrigin.current = { x: t.clientX, y: t.clientY };
      } else if (t.clientX >= mid && rTouch.current === null) {
        rTouch.current = t.identifier;
        rLast.current = { x: t.clientX, y: t.clientY };
      }
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
        if (lStick.current) {
          lStick.current.style.transform = `translate(${Math.min(30, Math.max(-30, dx * 30))}px,${Math.min(30, Math.max(-30, dy * 30))}px)`;
        }
      }
      if (t.identifier === rTouch.current) {
        yawRef.current -= (t.clientX - rLast.current.x) * 0.006;
        rLast.current = { x: t.clientX, y: t.clientY };
      }
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lTouch.current) {
        moveRef.current.f = 0;
        moveRef.current.r = 0;
        lTouch.current = null;
        if (lStick.current) lStick.current.style.transform = "translate(0,0)";
      }
      if (t.identifier === rTouch.current) rTouch.current = null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-auto"
      style={{ touchAction: "none" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="absolute bottom-24 left-8"
        style={{ width: 90, height: 90, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: "2px solid rgba(201,168,76,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          ref={lStick}
          style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(201,168,76,0.6)", border: "2px solid rgba(201,168,76,0.9)", transition: "transform 0.04s ease", pointerEvents: "none" }}
        />
      </div>
      <div
        className="absolute bottom-24 right-8"
        style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <p style={{ fontSize: 9, color: "rgba(201,168,76,0.35)", textAlign: "center", fontFamily: "EB Garamond, serif" }}>
          drag<br />to look
        </p>
      </div>
    </div>
  );
}

function InfiniteTerrain() {
  const stones = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const angle = (i / 120) * Math.PI * 2;
      const radius = 56 + ((i * 19) % 54);
      return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, angle };
    });
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300, 24, 24]} />
        <meshStandardMaterial color="#100c06" roughness={0.98} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[86, 140, 128]} />
        <meshStandardMaterial color="#0b0804" transparent opacity={0.82} roughness={1} />
      </mesh>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, 0.01, s.z]} rotation={[-Math.PI / 2, 0, s.angle]} receiveShadow>
          <planeGeometry args={[2.8, 1.6]} />
          <meshStandardMaterial color={i % 2 ? "#151008" : "#0d0a05"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function HarborWater() {
  return (
    <group position={[0, 0, -88]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <planeGeometry args={[300, 150]} />
        <meshStandardMaterial color="#0f2a4a" roughness={0.16} metalness={0.75} transparent opacity={0.92} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15 + i * 0.006, -24 + i * 9]}>
          <planeGeometry args={[270, 7]} />
          <meshStandardMaterial color={i % 2 ? "#1e4d73" : "#143858"} transparent opacity={0.22} roughness={0.25} metalness={0.55} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 54]}>
        <planeGeometry args={[200, 8]} />
        <meshStandardMaterial color="#2a1a0b" roughness={0.96} />
      </mesh>
    </group>
  );
}

function Street() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[7.5, 80]} />
        <meshStandardMaterial color="#1c1408" roughness={0.94} />
      </mesh>
      {[-3.8, 3.8].map((sx, si) =>
        Array.from({ length: 26 }, (_, i) => (
          <mesh key={`curb-${si}-${i}`} position={[sx, 0.06, -31 + i * 2.6]} castShadow receiveShadow>
            <boxGeometry args={[0.28, 0.12, 2.3]} />
            <meshStandardMaterial color="#1e1810" roughness={0.95} />
          </mesh>
        ))
      )}
      {/* Cobblestone paths between buildings and street on each side */}
      {BUILDINGS.map((b) => (
        <mesh
          key={`path-${b.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[b.x < 0 ? -6.5 : 6.5, 0.008, b.z]}
          receiveShadow
        >
          <planeGeometry args={[5, b.d]} />
          <meshStandardMaterial color="#181410" roughness={0.97} />
        </mesh>
      ))}
    </>
  );
}

// ── Building ──────────────────────────────────────────────────────────────────

function Building({ def, active }: { def: BuildingDef; active: boolean }) {
  const { x, z, w, h, d, brick, roof, win, label, icon, pillars, large } = def;
  const left = x < 0;
  // Front face — toward the street (toward x=0)
  const fz = left ? d / 2 : -(d / 2);
  const fDir = left ? 1 : -1;
  const frontZ = fz + fDir * 0.08;
  const lowerWindows = large ? [-w * 0.34, 0, w * 0.34] : [-w * 0.3, w * 0.3];
  const upperWindows = large ? [-w * 0.28, w * 0.28] : [0];
  // Street sign position — just outside the building toward street (between building and curb)
  const signPostX = left ? x + d / 2 + 1.8 : x - d / 2 - 1.8;

  return (
    <group position={[x, 0, z]}>
      {/* Foundation */}
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 1, 0.44, d + 1]} />
        <meshStandardMaterial color="#241a0e" roughness={0.98} />
      </mesh>

      {/* Main walls */}
      <mesh position={[0, h / 2 + 0.44, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={brick} roughness={0.82} metalness={0.02} />
      </mesh>

      {/* Roof overhang */}
      <mesh position={[0, h + 0.44, 0]} castShadow>
        <boxGeometry args={[w + 1.1, 0.22, d + 1.1]} />
        <meshStandardMaterial color={roof} roughness={0.95} />
      </mesh>

      {/* Roof cone */}
      <mesh position={[0, h + 0.44 + (large ? 2.5 : 2.0), 0]} castShadow>
        <coneGeometry args={[Math.max(w, d) * 0.8, large ? 5.0 : 4.0, 4]} />
        <meshStandardMaterial color={roof} roughness={0.96} metalness={0.04} />
      </mesh>

      <Chimney position={[-w * 0.28, h + 0.44, -d * 0.18]} large={large} roof={roof} />
      <Chimney position={[w * 0.3, h + 0.44, d * 0.15]} large={large} roof={roof} />

      {lowerWindows.map((wx) => (
        <Window key={`l-${wx}`} position={[wx, h * 0.58 + 0.44, frontZ]} color={win} active={active} />
      ))}
      {upperWindows.map((wx) => (
        <Window key={`u-${wx}`} position={[wx, h * 0.82 + 0.44, frontZ]} color={win} active={active} />
      ))}

      {/* Door — animated swing when active */}
      <group position={[0, h * 0.22 + 0.44, frontZ]}>
        <AnimatedDoor h={h} win={win} active={active} />
      </group>

      {/* Pillars for grand buildings */}
      {pillars &&
        [-w * 0.34, -w * 0.13, w * 0.13, w * 0.34].map((px) => (
          <mesh key={px} position={[px, h * 0.3 + 0.44, fz + fDir * 0.55]} castShadow>
            <cylinderGeometry args={[0.18, 0.23, h * 0.6, 12]} />
            <meshStandardMaterial color="#3a2510" roughness={0.85} />
          </mesh>
        ))}
      {pillars && (
        <mesh position={[0, h * 0.6 + 0.44, fz + fDir * 0.53]}>
          <boxGeometry args={[w * 0.88, 0.32, 0.55]} />
          <meshStandardMaterial color="#2a1c0c" roughness={0.9} />
        </mesh>
      )}

      {/* Window glow */}
      <pointLight position={[0, h * 0.58, fz + fDir * 1.8]} intensity={active ? 8 : 3.8} distance={active ? 16 : 11} color={win} decay={2} />

      {/* Active entry ring + sparkles */}
      {active && (
        <>
          <mesh position={[0, 0.06, fz + fDir * 1.35]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.65, 2.32, 48]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} />
          </mesh>
          <pointLight position={[0, 2.2, fz + fDir * 1.65]} intensity={9} distance={12} color="#fbbf24" decay={2} />
          <Sparkles count={38} scale={[3.2, 3.1, 2]} position={[0, 2.2, fz + fDir * 1.8]} size={3} speed={0.9} color="#fbbf24" opacity={0.85} />
        </>
      )}

      {/* High sign on building face */}
      <BuildingSign label={label} icon={icon} active={active} position={[0, h * 0.68 + 0.44, fz + fDir * 0.62]} />

      {/* Street-level sign post — positioned between building and curb */}
      <StreetSignPost
        label={label}
        icon={icon}
        active={active}
        position={[signPostX - x, 0, 0]}
        faceLeft={!left}
      />
    </group>
  );
}

// ── Door with swing-open animation ────────────────────────────────────────────

function AnimatedDoor({ h, win, active }: { h: number; win: string; active: boolean }) {
  const doorPanelRef = useRef<THREE.Group>(null);
  const doorW = 1.28;
  const doorH = h * 0.38;

  useFrame((_, delta) => {
    if (!doorPanelRef.current) return;
    // Target: open = -π*0.65 (swing away from player), closed = 0
    const target = active ? -Math.PI * 0.65 : 0;
    doorPanelRef.current.rotation.y = THREE.MathUtils.lerp(
      doorPanelRef.current.rotation.y,
      target,
      delta * 5
    );
  });

  return (
    <group>
      {/* Door frame */}
      <mesh>
        <boxGeometry args={[1.65, h * 0.45, 0.13]} />
        <meshStandardMaterial color="#1c0e06" roughness={0.9} />
      </mesh>

      {/* Door panel — pivots around its left hinge */}
      <group ref={doorPanelRef} position={[-doorW / 2, 0, 0.07]}>
        <mesh position={[doorW / 2, 0, 0]}>
          <boxGeometry args={[doorW, doorH, 0.065]} />
          <meshStandardMaterial color="#3d1a08" roughness={0.82} />
        </mesh>

        {/* Decorative panels on door */}
        <mesh position={[doorW / 2, doorH * 0.18, 0.038]}>
          <boxGeometry args={[doorW * 0.7, doorH * 0.35, 0.02]} />
          <meshStandardMaterial color="#2a1005" roughness={0.88} />
        </mesh>
        <mesh position={[doorW / 2, -doorH * 0.2, 0.038]}>
          <boxGeometry args={[doorW * 0.7, doorH * 0.35, 0.02]} />
          <meshStandardMaterial color="#2a1005" roughness={0.88} />
        </mesh>

        {/* Brass door knob */}
        <mesh position={[doorW - 0.14, -0.08, 0.06]}>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color="#d6a23a" emissive="#d6a23a" emissiveIntensity={active ? 1.2 : 0.4} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Fanlight window above door */}
      <mesh position={[0, h * 0.21, 0.1]}>
        <boxGeometry args={[1.3, 0.44, 0.05]} />
        <meshStandardMaterial color={win} emissive={win} emissiveIntensity={active ? 2.4 : 1.2} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

// ── Building face sign ────────────────────────────────────────────────────────

function BuildingSign({
  label,
  icon,
  position,
  active,
}: {
  label: string;
  icon: string;
  position: [number, number, number];
  active: boolean;
}) {
  return (
    <group position={position}>
      {/* Sign bracket bar */}
      <mesh position={[0, 0.68, -0.1]} castShadow>
        <boxGeometry args={[2.6, 0.12, 0.12]} />
        <meshStandardMaterial color="#1c140f" metalness={0.8} roughness={0.28} />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.12, 0.96, 0.15]} />
        <meshStandardMaterial
          color={active ? "#6b3818" : "#4a2a12"}
          roughness={0.68}
          emissive={active ? "#3a2010" : "#000000"}
          emissiveIntensity={active ? 0.5 : 0}
        />
      </mesh>
      <Text position={[0, 0.04, 0.18]} fontSize={0.27} anchorX="center" anchorY="middle" color="#ffe8a3" outlineWidth={0.02} outlineColor="#1a1208">
        {icon}
      </Text>
      <Text position={[0, -0.28, 0.18]} fontSize={0.145} maxWidth={1.72} textAlign="center" anchorX="center" anchorY="middle" color={active ? "#fff9d8" : "#f0c96a"} outlineWidth={0.022} outlineColor="#0f0a05" lineHeight={1.1}>
        {label.toUpperCase().replace(/ /g, "\n")}
      </Text>
    </group>
  );
}

// ── Street-level sign post ────────────────────────────────────────────────────
// Placed between building and curb, sign faces the street

function StreetSignPost({
  label,
  icon,
  position,
  active,
  faceLeft,
}: {
  label: string;
  icon: string;
  position: [number, number, number];
  active: boolean;
  faceLeft: boolean;
}) {
  // Sign faces toward the street (x=0), so it rotates based on which side it's on
  const rotY = faceLeft ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Wooden post */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.08, 2.2, 8]} />
        <meshStandardMaterial color="#3a2010" roughness={0.92} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[1.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#3a2010" roughness={0.92} />
      </mesh>
      {/* Sign hanging board */}
      <mesh position={[0, 1.68, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.58, 0.1]} />
        <meshStandardMaterial
          color={active ? "#7a4020" : "#5a3018"}
          roughness={0.75}
          emissive={active ? "#3a1a08" : "#000"}
          emissiveIntensity={active ? 0.5 : 0}
        />
      </mesh>
      {/* Chains/strings holding sign */}
      {[-0.6, 0.6].map((ox) => (
        <mesh key={ox} position={[ox, 1.95, 0.04]}>
          <cylinderGeometry args={[0.012, 0.012, 0.52, 6]} />
          <meshStandardMaterial color="#8a6830" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* Icon */}
      <Text position={[-0.38, 1.68, 0.12]} fontSize={0.22} anchorX="center" anchorY="middle" color="#ffe8a3">
        {icon}
      </Text>
      {/* Name text */}
      <Text
        position={[0.12, 1.68, 0.12]}
        fontSize={0.115}
        maxWidth={0.9}
        textAlign="left"
        anchorX="left"
        anchorY="middle"
        color={active ? "#fff9d8" : "#e8c870"}
        outlineWidth={0.018}
        outlineColor="#1a0e04"
        lineHeight={1.15}
      >
        {label.replace("\n", " ").toUpperCase()}
      </Text>
    </group>
  );
}

// ── Misc environment ──────────────────────────────────────────────────────────

function Window({ position, color, active }: { position: [number, number, number]; color: string; active: boolean }) {
  return (
    <group position={position}>
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

function LanternPost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 5.3, 8]} />
        <meshStandardMaterial color="#2a1808" roughness={0.88} metalness={0.15} />
      </mesh>
      <group position={[0.62, 5.35, 0]}>
        <mesh>
          <boxGeometry args={[0.32, 0.44, 0.32]} />
          <meshStandardMaterial color="#c9a84c" emissive="#c9a84c" emissiveIntensity={0.9} transparent opacity={0.82} />
        </mesh>
        <pointLight intensity={5} distance={16} color="#fbbf24" decay={2} />
      </group>
    </group>
  );
}

function Fountain() {
  return (
    <group position={[0, 0, 0]}>
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

function Trees() {
  const positions: [number, number, number, number][] = [
    [-24, 0, -30, 1.2],
    [-26, 0, -10, 1.1],
    [-24, 0, 12, 1.3],
    [24, 0, -30, 1.1],
    [26, 0, -10, 1.2],
    [24, 0, 12, 1.0],
    [-42, 0, 28, 1.4],
    [42, 0, 30, 1.5],
    [-30, 0, 40, 1.1],
    [30, 0, 42, 1.2],
    [0, 0, -45, 1.3],
    [18, 0, -38, 1.0],
    [-18, 0, -38, 1.1],
  ];
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

// ── More human-shaped NPC/player figures ──────────────────────────────────────

function HumanFigure({
  coatColor,
  skinColor,
  hatColor,
  name,
  nameColor = "#fbbf24",
  distanceFactor = 7,
}: {
  coatColor: string;
  skinColor: string;
  hatColor: string;
  name: string;
  nameColor?: string;
  distanceFactor?: number;
}) {
  return (
    <group>
      {/* Left leg */}
      <mesh position={[-0.1, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.075, 0.82, 8]} />
        <meshStandardMaterial color="#1a1408" roughness={0.9} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.1, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.075, 0.82, 8]} />
        <meshStandardMaterial color="#1a1408" roughness={0.9} />
      </mesh>
      {/* Left boot */}
      <mesh position={[-0.1, 0.06, 0.04]} castShadow>
        <boxGeometry args={[0.15, 0.12, 0.28]} />
        <meshStandardMaterial color="#0a0806" roughness={0.92} />
      </mesh>
      {/* Right boot */}
      <mesh position={[0.1, 0.06, 0.04]} castShadow>
        <boxGeometry args={[0.15, 0.12, 0.28]} />
        <meshStandardMaterial color="#0a0806" roughness={0.92} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.22]} />
        <meshStandardMaterial color={coatColor} roughness={0.82} />
      </mesh>
      {/* Waistcoat/vest layer */}
      <mesh position={[0, 1.08, 0.1]}>
        <boxGeometry args={[0.22, 0.5, 0.04]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.78} emissive="#c9a84c" emissiveIntensity={0.08} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.26, 1.05, 0]} rotation={[0, 0, 0.18]} castShadow>
        <cylinderGeometry args={[0.068, 0.055, 0.56, 8]} />
        <meshStandardMaterial color={coatColor} roughness={0.84} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.26, 1.05, 0]} rotation={[0, 0, -0.18]} castShadow>
        <cylinderGeometry args={[0.068, 0.055, 0.56, 8]} />
        <meshStandardMaterial color={coatColor} roughness={0.84} />
      </mesh>
      {/* Left hand */}
      <mesh position={[-0.3, 0.78, 0]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </mesh>
      {/* Right hand */}
      <mesh position={[0.3, 0.78, 0]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.44, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 0.14, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.195, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.78} />
      </mesh>
      {/* Tricorn hat brim */}
      <mesh position={[0, 1.88, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 20]} />
        <meshStandardMaterial color={hatColor} roughness={0.88} />
      </mesh>
      {/* Hat crown */}
      <mesh position={[0, 2.04, 0]}>
        <cylinderGeometry args={[0.19, 0.22, 0.32, 12]} />
        <meshStandardMaterial color={hatColor} roughness={0.88} />
      </mesh>
      {/* Hat band */}
      <mesh position={[0, 1.93, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.06, 12]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.6} emissive="#c9a84c" emissiveIntensity={0.15} metalness={0.3} />
      </mesh>
      {/* Name tag */}
      <Html position={[0, 2.55, 0]} center distanceFactor={distanceFactor} style={{ pointerEvents: "none" }}>
        <div style={{ background: "rgba(0,0,0,0.78)", color: nameColor, padding: "3px 9px", borderRadius: 7, fontSize: 11, fontFamily: "EB Garamond, serif", whiteSpace: "nowrap", border: "1px solid rgba(201,168,76,0.45)" }}>
          {name}
        </div>
      </Html>
    </group>
  );
}

// Ben NPC — distinguished gold-accented coat
function BenNPC({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.55;
  });

  return (
    <group ref={groupRef} position={position}>
      <HumanFigure
        coatColor="#163a63"
        skinColor="#d4a876"
        hatColor="#1b1510"
        name="Ben Franklin"
        nameColor="#fbbf24"
        distanceFactor={5}
      />
    </group>
  );
}

// Town NPC citizens with walking animation
function Citizen({ name, position, color, skin = "#d4a876", walkRadius = 0, walkSpeed = 1 }: {
  name: string;
  position: [number, number, number];
  color: string;
  skin?: string;
  walkRadius?: number;
  walkSpeed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const timeOffset = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    if (!groupRef.current || walkRadius === 0) return;
    const t = clock.elapsedTime * walkSpeed + timeOffset.current;
    groupRef.current.position.x = position[0] + Math.cos(t) * walkRadius;
    groupRef.current.position.z = position[2] + Math.sin(t) * walkRadius;
    groupRef.current.rotation.y = -t + Math.PI / 2;
  });

  return (
    <group ref={groupRef} position={position}>
      <HumanFigure
        coatColor={color}
        skinColor={skin}
        hatColor="#1a1208"
        name={name}
        distanceFactor={7}
      />
    </group>
  );
}

function TownLife() {
  return (
    <>
      <Citizen name="Merchant" position={[-2.5, 0, -1.6]} color="#4a2e0e" skin="#c49060" walkRadius={1.2} walkSpeed={0.35} />
      <Citizen name="Postmaster" position={[-3.2, 0, 5]} color="#1a3a6b" walkRadius={0.8} walkSpeed={0.28} />
      <Citizen name="Blacksmith" position={[3.2, 0, 13]} color="#3a3030" skin="#a87040" walkRadius={1.0} walkSpeed={0.4} />
      <Citizen name="Farmer" position={[22, 0, 8]} color="#4a3c1a" walkRadius={2.0} walkSpeed={0.22} />
      <Citizen name="Sailor" position={[-20, 0, -28]} color="#1a2a4a" walkRadius={1.5} walkSpeed={0.32} />
      <Wagon position={[2.8, 0, -2]} rotation={[0, -0.45, 0]} />
      <Horse position={[1.5, 0, -3.2]} rotation={[0, -0.45, 0]} />
    </>
  );
}

function Horse({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.2, 0.52, 0.42]} />
        <meshStandardMaterial color="#3a2216" roughness={0.9} />
      </mesh>
      {/* Head */}
      <mesh position={[0.55, 1.0, 0]} castShadow>
        <boxGeometry args={[0.38, 0.3, 0.22]} />
        <meshStandardMaterial color="#3a2216" roughness={0.9} />
      </mesh>
      {/* Legs */}
      {[-0.38, 0.38].map((lx) =>
        [-0.5, 0.5].map((lz) => (
          <mesh key={`${lx}-${lz}`} position={[lx, 0.3, lz * 0.7]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.62, 6]} />
            <meshStandardMaterial color="#2a1a0e" roughness={0.92} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Wagon({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.4, 0.55, 0.85]} />
        <meshStandardMaterial color="#3a210e" roughness={0.9} />
      </mesh>
      {[-0.55, 0.55].map((x) =>
        [-0.48, 0.48].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.035, 10, 20]} />
            <meshStandardMaterial color="#140b05" roughness={0.95} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Ship({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
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

// ── Other multiplayer player ──────────────────────────────────────────────────

function OtherPlayer({
  x, z, yaw, avatarIdx, name,
}: {
  x: number; z: number; yaw: number; avatarIdx: number; name: string;
}) {
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
      <HumanFigure
        coatColor={av.coat}
        skinColor={av.skin}
        hatColor={av.hat}
        name={name}
        nameColor="#c9a84c"
        distanceFactor={8}
      />
    </group>
  );
}

// ── Entry cinematic ───────────────────────────────────────────────────────────

function EntryTransition({ building, onDone }: { building: BuildingDef; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center,rgba(0,0,0,.18) 0%,rgba(0,0,0,.98) 100%)" }}
    >
      <div style={{ fontSize: 78, marginBottom: 18 }}>{building.icon}</div>
      <h2
        style={{
          fontFamily: "EB Garamond, serif",
          color: "#c9a84c",
          fontSize: 30,
          fontWeight: "bold",
          letterSpacing: "0.12em",
          textAlign: "center",
          whiteSpace: "pre-line",
          marginBottom: 14,
        }}
      >
        {building.label}
      </h2>
      <p style={{ fontFamily: "EB Garamond, serif", color: "rgba(201,168,76,.55)", fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase" }}>
        Entering…
      </p>
    </div>
  );
}
