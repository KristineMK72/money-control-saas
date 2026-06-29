"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Sky, PointerLockControls, Html, Environment, Sparkles,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useState, useEffect, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ─── Buildings ───────────────────────────────────────────────── */
const BUILDINGS = [
  { id:"gov",    href:"/dashboard",    label:"Governor's\nOffice",  icon:"🏛",  x:-10, z:-16, w:11, h:9,  d:9,  brick:"#3d2214", roof:"#1a1210", win:"#ffe066", enter:7, collide:6.5, pillars:true,  large:true  },
  { id:"income", href:"/income",       label:"Income\nLedger",      icon:"📜",  x:-10, z:-5,  w:8,  h:6,  d:7,  brick:"#2e1a10", roof:"#16100a", win:"#6ee7b7", enter:5, collide:5,   pillars:false, large:false },
  { id:"bills",  href:"/bills",        label:"Post\nOffice",        icon:"📋",  x:-10, z:6,   w:8,  h:6,  d:7,  brick:"#2a180e", roof:"#161008", win:"#fdba74", enter:5, collide:5,   pillars:false, large:false },
  { id:"pay",    href:"/payments",     label:"Payment\nHall",       icon:"🪙",  x:-10, z:17,  w:9,  h:7,  d:8,  brick:"#281a0a", roof:"#12100a", win:"#fcd34d", enter:6, collide:5.5, pillars:true,  large:false },
  { id:"trophy", href:"/achievements", label:"Trophy\nRoom",        icon:"🏆",  x:10,  z:-16, w:11, h:9,  d:9,  brick:"#2e0f0f", roof:"#160808", win:"#fca5a5", enter:7, collide:6.5, pillars:true,  large:true  },
  { id:"obs",    href:"/forecast",     label:"Observatory",         icon:"🔭",  x:10,  z:-5,  w:8,  h:8,  d:8,  brick:"#0e1a2e", roof:"#080e18", win:"#bfdbfe", enter:5, collide:5,   pillars:false, large:false },
  { id:"cal",    href:"/calendar",     label:"Town\nSquare",        icon:"🗓️", x:10,  z:6,   w:8,  h:6,  d:7,  brick:"#201808", roof:"#100e04", win:"#c4b5fd", enter:5, collide:5,   pillars:false, large:false },
  { id:"set",    href:"/settings",     label:"Smithy",              icon:"⚙️", x:10,  z:17,  w:8,  h:6,  d:7,  brick:"#181818", roof:"#0c0c0c", win:"#cbd5e1", enter:5, collide:5,   pillars:false, large:false },
] as const;

/* ─── Avatars ─────────────────────────────────────────────────── */
const AVATARS = [
  { color:"#8b1a1a", title:"Captain",    hat:"#1a0a0a" },
  { color:"#1a3a6b", title:"Patriot",    hat:"#0a0e1a" },
  { color:"#4a2e0e", title:"Merchant",   hat:"#1a0f04" },
  { color:"#1a4a1a", title:"Ranger",     hat:"#081408" },
  { color:"#1a1a1a", title:"Magistrate", hat:"#0a0a0a" },
  { color:"#4a1a6b", title:"Governor",   hat:"#1a0824" },
];

const SPEED      = 8;
const EYE_HEIGHT = 1.75;
const CHANNEL    = "colonial-world-v2";

/* ─── Door sound ──────────────────────────────────────────────── */
function playDoorSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(), dist = ctx.createWaveShaper(), gain = ctx.createGain();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x=(i*2)/256-1; curve[i]=(Math.PI+300)*x/(Math.PI+300*Math.abs(x)); }
    dist.curve = curve; osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.7);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.75);
    osc.connect(dist); dist.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.75);
    setTimeout(() => {
      const c2 = new (window.AudioContext||(window as any).webkitAudioContext)();
      const o2 = c2.createOscillator(), g2 = c2.createGain();
      o2.type = "sine"; o2.frequency.value = 528;
      g2.gain.setValueAtTime(0.25, c2.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 1.4);
      o2.connect(g2); g2.connect(c2.destination); o2.start(); o2.stop(c2.currentTime + 1.4);
    }, 500);
  } catch {}
}

/* ─── Multiplayer ─────────────────────────────────────────────── */
type PlayerState = { userId:string; username:string; avatarIdx:number; x:number; z:number; yaw:number };

function useMultiplayer(userId: string|null, username: string, avatarIdx: number) {
  const supabase      = createSupabaseBrowserClient();
  const [others, setOthers] = useState<Record<string, PlayerState>>({});
  const channelRef    = useRef<any>(null);
  const lastBroadcast = useRef(0);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(CHANNEL);
    channelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PlayerState>();
      const out: Record<string, PlayerState> = {};
      for (const [key, vals] of Object.entries(state)) {
        if (key !== userId && Array.isArray(vals) && vals[0]) out[key] = vals[0] as PlayerState;
      }
      setOthers(out);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ userId, username, avatarIdx, x: 0, z: 27, yaw: 0 });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const broadcast = useCallback((x: number, z: number, yaw: number) => {
    const now = Date.now();
    if (now - lastBroadcast.current < 150) return;
    lastBroadcast.current = now;
    channelRef.current?.track({ userId, username, avatarIdx, x, z, yaw });
  }, [userId, username, avatarIdx]);

  return { others, broadcast };
}

/* ═══════════════════════════════════════════════════════════════ */
export default function ColonialTown3D() {
  const router = useRouter();
  const moveRef   = useRef({ f: 0, r: 0 });
  const mobileYaw = useRef(0);
  const [locked,   setLocked]   = useState(false);
  const [near,     setNear]     = useState<typeof BUILDINGS[number]|null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [entering, setEntering] = useState<typeof BUILDINGS[number]|null>(null);
  const [userId,   setUserId]   = useState<string|null>(null);
  const [username, setUsername] = useState("Colonist");
  const [avatarIdx,    setAvatarIdx]    = useState(0);
  const [avatarPicked, setAvatarPicked] = useState(false);

  useEffect(() => {
    setIsMobile("ontouchstart" in window);
    const saved = localStorage.getItem("colonial-avatar");
    if (saved !== null) { setAvatarIdx(parseInt(saved)); setAvatarPicked(true); }
  }, []);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await sb.from("profiles").select("full_name").eq("id", user.id).single();
      if (data?.full_name) setUsername(data.full_name.split(" ")[0]);
    })();
  }, []);

  const { others, broadcast } = useMultiplayer(userId, username, avatarIdx);

  const enter = useCallback(() => {
    if (near && !entering) { setEntering(near); playDoorSound(); }
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

  return (
    <div className="relative w-full h-full">
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
            onNear={setNear}
            onLock={setLocked}
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

      {/* Start / avatar picker overlay */}
      {!locked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="text-center px-8 py-7 rounded-3xl mx-4 max-w-sm w-full"
            style={{
              background: "rgba(8,4,2,0.97)",
              border: "1px solid rgba(201,168,76,0.5)",
              fontFamily: "EB Garamond, serif",
              boxShadow: "0 0 60px rgba(201,168,76,0.12)",
            }}
          >
            <div className="text-5xl mb-3">🏛</div>
            <h2 className="font-cinzel text-2xl font-bold mb-1" style={{ color: "#c9a84c" }}>
              Walk the Colony
            </h2>
            <p className="text-sm mb-5" style={{ color: "#6b4423" }}>Choose thy colonial title</p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => pickAvatar(i)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
                  style={{
                    background: avatarIdx === i ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.03)",
                    border: avatarIdx === i ? "2px solid #c9a84c" : "2px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="relative" style={{ width: 36, height: 52 }}>
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 0, width: 28, height: 8, background: a.hat, borderRadius: "3px 3px 0 0" }} />
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 6, width: 36, height: 4, background: a.hat, borderRadius: 2 }} />
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 10, width: 22, height: 22, borderRadius: "50%", background: "#d4a876" }} />
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 30, width: 22, height: 22, borderRadius: "4px 4px 0 0", background: a.color }} />
                  </div>
                  <p className="font-cinzel text-center leading-tight" style={{ fontSize: 9, color: avatarIdx === i ? "#c9a84c" : "#6b4423" }}>
                    {a.title}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (!avatarPicked) return;
                if (isMobile) {
                  setLocked(true);
                } else {
                  document.querySelector("canvas")?.click();
                }
              }}
              className="w-full rounded-2xl py-3 font-cinzel font-bold text-base transition-all"
              style={{
                background: avatarPicked ? "#c9a84c" : "rgba(201,168,76,0.3)",
                color: "#1a0f0a",
                cursor: avatarPicked ? "pointer" : "default",
              }}
            >
              Enter the Colony
            </button>

            {isMobile ? (
              <p className="text-xs mt-3 italic" style={{ color: "#4a2e0e" }}>
                Left stick: move · Right drag: look
              </p>
            ) : (
              <p className="text-xs mt-3 italic" style={{ color: "#4a2e0e" }}>
                WASD · Mouse to look · E to enter buildings
              </p>
            )}
          </div>
        </div>
      )}

      {/* Building entry button */}
      {(locked || isMobile) && near && !entering && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center z-30">
          <button
            onClick={enter}
            className="px-8 py-4 rounded-2xl font-cinzel text-base font-bold transition-transform active:scale-95"
            style={{ background: "rgba(201,168,76,0.95)", color: "#1a0f0a", boxShadow: "0 0 30px rgba(201,168,76,0.6)" }}
          >
            {near.icon} Enter {near.label.replace("\n", " ")}{!isMobile ? " · E" : ""}
          </button>
        </div>
      )}

      {/* Online count */}
      {(locked || (isMobile && avatarPicked)) && Object.keys(others).length > 0 && (
        <div
          className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(201,168,76,0.3)" }}
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-cinzel text-xs" style={{ color: "#c9a84c" }}>
            {Object.keys(others).length} colonist{Object.keys(others).length !== 1 ? "s" : ""} online
          </span>
        </div>
      )}

      {/* Crosshair */}
      {(locked || isMobile) && !entering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(201,168,76,0.8)", boxShadow: "0 0 8px rgba(201,168,76,0.6)" }} />
        </div>
      )}

      {locked && !isMobile && !entering && (
        <p className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-xs font-cinzel"
           style={{ color: "rgba(201,168,76,0.35)" }}>
          ESC to release mouse
        </p>
      )}

      {isMobile && locked && <MobileControls moveRef={moveRef} yawRef={mobileYaw} />}

      {entering && (
        <EntryTransition
          building={entering}
          onDone={() => { router.push(entering.href); setEntering(null); }}
        />
      )}
    </div>
  );
}

/* ─── Scene ───────────────────────────────────────────────────── */
function Scene({ moveRef, mobileYaw, isMobile, onNear, onLock, others, broadcast }: {
  moveRef:   React.MutableRefObject<{ f: number; r: number }>;
  mobileYaw: React.MutableRefObject<number>;
  isMobile:  boolean;
  onNear:    (b: typeof BUILDINGS[number]|null) => void;
  onLock:    (v: boolean) => void;
  others:    Record<string, any>;
  broadcast: (x: number, z: number, yaw: number) => void;
}) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (isMobile || !controlsRef.current) return;
    const c = controlsRef.current;
    const lock = () => onLock(true), unlock = () => onLock(false);
    c.addEventListener("lock", lock); c.addEventListener("unlock", unlock);
    return () => { c.removeEventListener("lock", lock); c.removeEventListener("unlock", unlock); };
  }, [isMobile]);

  useEffect(() => {
    const keys: Record<string, boolean> = {};
    const dn = (e: KeyboardEvent) => { keys[e.code] = true;  sync(); };
    const up = (e: KeyboardEvent) => { keys[e.code] = false; sync(); };
    function sync() {
      moveRef.current.f = (keys["KeyW"]||keys["ArrowUp"]    ? 1 : 0) - (keys["KeyS"]||keys["ArrowDown"]  ? 1 : 0);
      moveRef.current.r = (keys["KeyD"]||keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"]||keys["ArrowLeft"]  ? 1 : 0);
    }
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((state, delta) => {
    const cam = state.camera;
    const dt  = Math.min(delta, 0.05);
    const { f, r } = moveRef.current;

    if (isMobile) { cam.rotation.order = "YXZ"; cam.rotation.y = mobileYaw.current; }

    if (f !== 0 || r !== 0) {
      const yaw = cam.rotation.y;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const rgt = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
      const dir = new THREE.Vector3().addScaledVector(fwd, f).addScaledVector(rgt, r)
        .normalize().multiplyScalar(SPEED * dt);
      const next = cam.position.clone().add(dir);
      const blocked = BUILDINGS.some(b => {
        const dx = next.x - b.x, dz = next.z - b.z;
        return Math.sqrt(dx*dx + dz*dz) < b.collide + 1.5;
      }) || Math.abs(next.x) > 24 || next.z < -28 || next.z > 28;
      if (!blocked) { cam.position.x = next.x; cam.position.z = next.z; }
    }
    cam.position.y = EYE_HEIGHT;

    broadcast(cam.position.x, cam.position.z, cam.rotation.y);

    let found: typeof BUILDINGS[number]|null = null, best = Infinity;
    for (const b of BUILDINGS) {
      const dx = cam.position.x - b.x, dz = cam.position.z - b.z;
      const d  = Math.sqrt(dx*dx + dz*dz);
      if (d < b.enter && d < best) { found = b; best = d; }
    }
    onNear(found);
  });

  return (
    <>
      <Sky distance={4500} sunPosition={[60,8,-80]} inclination={0.52} azimuth={0.22}
           turbidity={8} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.82} />
      <Environment preset="sunset" background={false} />
      <fog attach="fog" args={["#1a0f06", 40, 200]} />
      <ambientLight intensity={1.6} color="#ffe0b0" />
      <directionalLight position={[50,80,-60]} intensity={3.8} color="#ffcc88" castShadow
        shadow-mapSize={[4096,4096]} shadow-camera-near={1} shadow-camera-far={200}
        shadow-camera-left={-40} shadow-camera-right={40}
        shadow-camera-top={40} shadow-camera-bottom={-40} shadow-bias={-0.001} />
      <hemisphereLight args={["#6a4a2a","#1a1008",1.8]} />
      <Sparkles count={120} scale={[30,8,50]} position={[0,2,0]} size={1.5} speed={0.3} color="#fbbf24" opacity={0.5} />
      <Ground />
      <Street />
      {BUILDINGS.map(b => <Building key={b.id} def={b} />)}
      {[-18,-10,-2,8,18].map(z => (
        <>
          <LanternPost key={`l${z}`} position={[-3.8, 0, z]} />
          <LanternPost key={`r${z}`} position={[ 3.8, 0, z]} />
        </>
      ))}
      <Fountain />
      <ColonialTrees />
      {Object.entries(others).map(([id, p]) => (
        <OtherPlayer key={id} x={p.x} z={p.z} yaw={p.yaw} avatarIdx={p.avatarIdx ?? 0} name={p.username ?? "Colonist"} />
      ))}
      {!isMobile && <PointerLockControls ref={controlsRef} />}
    </>
  );
}

/* ─── Other player ────────────────────────────────────────────── */
function OtherPlayer({ x, z, yaw, avatarIdx, name }: {
  x: number; z: number; yaw: number; avatarIdx: number; name: string;
}) {
  const group = useRef<THREE.Group>(null);
  const av = AVATARS[avatarIdx] ?? AVATARS[0];

  useFrame(() => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x,   0.12);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, z,   0.12);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, yaw, 0.12);
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      {[-0.12, 0.12].map((lx, i) => (
        <mesh key={i} position={[lx, 0.45, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.9, 6]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.22, 0.2, 0.75, 8]} />
        <meshStandardMaterial color={av.color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.72, -0.08]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.3, 0.35, 0.1]} />
        <meshStandardMaterial color={av.color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.42, 0.12]}>
        <boxGeometry args={[0.14, 0.18, 0.06]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.66, 0]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color="#d4a876" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.88, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 0.04, 12]} />
        <meshStandardMaterial color={av.hat} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.07, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.34, 8]} />
        <meshStandardMaterial color={av.hat} roughness={0.9} />
      </mesh>
      <Html position={[0, 2.7, 0]} center distanceFactor={8} style={{ pointerEvents: "none", userSelect: "none" }}>
        <div style={{
          background: "rgba(0,0,0,0.75)", color: "#c9a84c",
          padding: "2px 8px", borderRadius: 6, fontSize: 10,
          fontFamily: "EB Garamond, serif", whiteSpace: "nowrap",
          border: "1px solid rgba(201,168,76,0.35)",
        }}>
          {name}
        </div>
      </Html>
    </group>
  );
}

/* ─── Ground ──────────────────────────────────────────────────── */
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100, 1, 1]} />
        <meshStandardMaterial color="#100c06" roughness={0.98} metalness={0} />
      </mesh>
      {Array.from({ length: 30 }, (_, row) =>
        Array.from({ length: 8 }, (__, col) => {
          const x = -13 + col * 3.8 + (row % 2) * 1.9, z = -22 + row * 1.6;
          return (
            <mesh key={`${row}-${col}`} rotation={[-Math.PI/2, 0, Math.random() * 0.3]} position={[x, 0.005, z]} receiveShadow>
              <planeGeometry args={[1.6 + Math.random() * 0.3, 1.1 + Math.random() * 0.2]} />
              <meshStandardMaterial color={`hsl(30,${20 + Math.random() * 10}%,${7 + Math.random() * 4}%)`} roughness={0.96} />
            </mesh>
          );
        })
      )}
    </>
  );
}

/* ─── Street ──────────────────────────────────────────────────── */
function Street() {
  return (
    <>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[7.5, 58]} />
        <meshStandardMaterial color="#1c1408" roughness={0.94} />
      </mesh>
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.015, -22 + i * 1.5]}>
          <planeGeometry args={[7.5, 0.04]} />
          <meshStandardMaterial color="#0e0b06" roughness={1} />
        </mesh>
      ))}
      {[-3.8, 3.8].map((sx, si) =>
        Array.from({ length: 16 }, (_, i) => (
          <mesh key={`k${si}-${i}`} position={[sx, 0.06, -18 + i * 2.6]} castShadow receiveShadow>
            <boxGeometry args={[0.28, 0.12, 2.3]} />
            <meshStandardMaterial color="#1e1810" roughness={0.95} />
          </mesh>
        ))
      )}
    </>
  );
}

/* ─── Building ────────────────────────────────────────────────── */
function Building({ def }: { def: typeof BUILDINGS[number] }) {
  const { x, z, w, h, d, brick, roof, win, label, icon, pillars, large } = def;
  const left = x < 0, fz = left ? d/2 : -(d/2), fDir = left ? 1 : -1;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 0.8, 0.44, d + 0.8]} />
        <meshStandardMaterial color="#141008" roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh position={[0, h/2 + 0.44, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={brick} roughness={0.88} metalness={0.01} envMapIntensity={0.4} />
      </mesh>
      {Array.from({ length: Math.floor(h / 0.28) }, (_, i) => (
        <mesh key={i} position={[0, 0.44 + i * 0.28, fz + fDir * 0.01]}>
          <planeGeometry args={[w, 0.02]} />
          <meshStandardMaterial color="#0a0704" roughness={1} transparent opacity={0.4} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.44 + (large ? 2.8 : 2.2), 0]} castShadow>
        <coneGeometry args={[Math.max(w, d) * 0.78, large ? 5.5 : 4.5, 4]} />
        <meshStandardMaterial color={roof} roughness={0.95} metalness={0.04} envMapIntensity={0.3} />
      </mesh>
      <mesh position={[0, h + 0.44, 0]} castShadow>
        <boxGeometry args={[w + 0.8, 0.2, d + 0.8]} />
        <meshStandardMaterial color={roof} roughness={0.96} />
      </mesh>
      {[[-w * 0.28, -d * 0.18], [w * 0.3, d * 0.15]].map(([cx, cz], ci) => (
        <group key={ci} position={[cx, h + 0.44, cz]}>
          <mesh castShadow>
            <boxGeometry args={[0.65, large ? 3.8 : 2.8, 0.65]} />
            <meshStandardMaterial color={roof} roughness={0.97} />
          </mesh>
          <mesh position={[0, large ? 2 : 1.5, 0]}>
            <boxGeometry args={[0.85, 0.18, 0.85]} />
            <meshStandardMaterial color="#0e0c0a" roughness={1} />
          </mesh>
          <Sparkles count={8} scale={[0.5, 2, 0.5]} position={[0, large ? 2.5 : 2, 0]} size={6} speed={0.4} color="#888880" opacity={0.25} />
        </group>
      ))}
      {(large ? [-w*0.32, 0, w*0.32] : [-w*0.28, w*0.28]).map((wx, wi) => (
        <group key={wi} position={[wx, h * 0.6 + 0.44, fz + fDir * 0.08]}>
          <mesh><boxGeometry args={[1.15, 1.55, 0.12]} /><meshStandardMaterial color="#1a1208" roughness={0.95} /></mesh>
          <mesh position={[0, 0, 0.06]}><boxGeometry args={[0.82, 1.15, 0.04]} /><meshStandardMaterial color={win} emissive={win} emissiveIntensity={1.8} transparent opacity={0.75} roughness={0.04} metalness={0.6} /></mesh>
          <mesh position={[0, 0, 0.09]}><boxGeometry args={[0.82, 0.04, 0.03]} /><meshStandardMaterial color="#1a1208" roughness={1} /></mesh>
          <mesh position={[0, 0, 0.09]}><boxGeometry args={[0.04, 1.15, 0.03]} /><meshStandardMaterial color="#1a1208" roughness={1} /></mesh>
          <mesh position={[0, -0.8, 0.08]}><boxGeometry args={[1.4, 0.12, 0.22]} /><meshStandardMaterial color="#141008" roughness={0.96} /></mesh>
        </group>
      ))}
      {(large ? [-w*0.3, w*0.3] : [0]).map((wx, wi) => (
        <group key={wi} position={[wx, h * 0.82 + 0.44, fz + fDir * 0.08]}>
          <mesh><boxGeometry args={[0.9, 1.1, 0.1]} /><meshStandardMaterial color="#1a1208" roughness={0.95} /></mesh>
          <mesh position={[0, 0, 0.06]}><boxGeometry args={[0.64, 0.8, 0.04]} /><meshStandardMaterial color={win} emissive={win} emissiveIntensity={1.4} transparent opacity={0.7} roughness={0.04} metalness={0.5} /></mesh>
        </group>
      ))}
      <group position={[0, h * 0.22 + 0.44, fz + fDir * 0.08]}>
        <mesh><boxGeometry args={[1.8, h * 0.46, 0.14]} /><meshStandardMaterial color="#1a1208" roughness={0.95} /></mesh>
        <mesh position={[0, 0, 0.08]}><boxGeometry args={[1.42, h * 0.42, 0.06]} /><meshStandardMaterial color="#1e0a04" roughness={0.85} metalness={0.05} /></mesh>
        {[-0.33, 0.33].map((dpx, di) => (
          <mesh key={di} position={[dpx, 0.1, 0.12]}><boxGeometry args={[0.52, h * 0.3, 0.04]} /><meshStandardMaterial color="#170804" roughness={0.88} /></mesh>
        ))}
        <mesh position={[0.55, -0.1, 0.14]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#c9a84c" emissive="#c9a84c" emissiveIntensity={0.4} roughness={0.3} metalness={0.9} /></mesh>
        <mesh position={[0, h * 0.24, 0.1]}><boxGeometry args={[1.42, 0.5, 0.06]} /><meshStandardMaterial color={win} emissive={win} emissiveIntensity={1.2} transparent opacity={0.7} roughness={0.08} metalness={0.4} /></mesh>
        {[0, 1].map(si => (
          <mesh key={si} position={[0, -h * 0.21 - 0.1 - si * 0.14, fDir * (0.25 + si * 0.25) + 0.08]} receiveShadow>
            <boxGeometry args={[2 + si * 0.4, 0.14, 0.55]} /><meshStandardMaterial color="#141008" roughness={0.97} />
          </mesh>
        ))}
      </group>
      {pillars && [-w*0.32, -w*0.12, w*0.12, w*0.32].map((px, pi) => (
        <mesh key={pi} position={[px, h * 0.3 + 0.44, fz + fDir * 0.5]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, h * 0.6, 10]} /><meshStandardMaterial color="#221808" roughness={0.88} />
        </mesh>
      ))}
      {pillars && (
        <mesh position={[0, h * 0.6 + 0.44, fz + fDir * 0.45]}>
          <boxGeometry args={[w * 0.85, 0.3, 0.5]} /><meshStandardMaterial color="#1e1408" roughness={0.9} />
        </mesh>
      )}
      {[-w/2, w/2].map((qx, qi) =>
        Array.from({ length: Math.floor(h / 1.4) }, (_, ri) => (
          <mesh key={`${qi}-${ri}`} position={[qx + (qx > 0 ? .05 : -.05), ri * 1.4 + 0.9, 0]}>
            <boxGeometry args={[0.14, 0.55, d + 0.14]} />
            <meshStandardMaterial color={`hsl(30,${25 + ri * 2}%,${12 + ri}%)`} roughness={0.93} />
          </mesh>
        ))
      )}
      <pointLight position={[0, h * 0.6, fz + fDir * 1.8]} intensity={3.5} distance={10} color={win} decay={2} />
      <pointLight position={[0, h * 0.6, 0]} intensity={0.8} distance={6} color={win} decay={2} />
      <Html position={[0, h + 8, 0]} center distanceFactor={10} style={{ pointerEvents: "none", userSelect: "none" }}>
        <div style={{
          textAlign: "center", fontFamily: "EB Garamond, serif", color: "#ffd700",
          textShadow: "0 0 20px rgba(201,168,76,1),0 0 40px rgba(201,168,76,0.6),0 2px 6px rgba(0,0,0,1)",
          whiteSpace: "pre-line", background: "rgba(0,0,0,0.55)", padding: "6px 10px",
          borderRadius: 8, border: "1px solid rgba(201,168,76,0.4)",
        }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>{icon}</div>
          <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: "0.1em", marginTop: 4 }}>{label}</div>
        </div>
      </Html>
    </group>
  );
}

/* ─── Lantern post ────────────────────────────────────────────── */
function LanternPost({ position }: { position: [number, number, number] }) {
  const [x,, z] = position;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.3, 8]} />
        <meshStandardMaterial color="#1e1208" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 5.3, 8]} />
        <meshStandardMaterial color="#2a1808" roughness={0.88} metalness={0.15} />
      </mesh>
      <mesh position={[0.35, 5.2, 0]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#2a1808" roughness={0.88} metalness={0.15} />
      </mesh>
      <group position={[0.62, 5.35, 0]}>
        <mesh>
          <boxGeometry args={[0.32, 0.44, 0.32]} />
          <meshStandardMaterial color="#c9a84c" emissive="#c9a84c" emissiveIntensity={0.9} transparent opacity={0.82} roughness={0.05} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.28, 0.22, 4]} />
          <meshStandardMaterial color="#1e1208" roughness={0.9} />
        </mesh>
        <pointLight intensity={5} distance={16} color="#fbbf24" decay={2} />
      </group>
    </group>
  );
}

/* ─── Fountain ────────────────────────────────────────────────── */
function Fountain() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.6, 3, 0.5, 16]} />
        <meshStandardMaterial color="#1a1208" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.65, 0]} receiveShadow>
        <cylinderGeometry args={[2, 2.4, 0.3, 16]} />
        <meshStandardMaterial color="#141008" roughness={0.97} />
      </mesh>
      <mesh position={[0, 0.82, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[1.8, 24]} />
        <meshStandardMaterial color="#1a4060" emissive="#1a4060" emissiveIntensity={0.4} transparent opacity={0.8} roughness={0.05} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 1.8, 10]} />
        <meshStandardMaterial color="#1e1208" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.3, 14, 14]} />
        <meshStandardMaterial color="#c9a84c" emissive="#c9a84c" emissiveIntensity={0.5} roughness={0.25} metalness={0.7} />
      </mesh>
      <Sparkles count={30} scale={[3, 2, 3]} position={[0, 1.2, 0]} size={2} speed={0.8} color="#93c5fd" opacity={0.6} />
      <pointLight position={[0, 1, 0]} intensity={2} distance={8} color="#60a5fa" decay={2} />
    </group>
  );
}

/* ─── Trees ───────────────────────────────────────────────────── */
function ColonialTrees() {
  const positions: [number, number, number, number][] = [
    [-16, 0, -20, 0.9], [-16, 0, -8, 1.1], [-16, 0, 4, 1.0], [-16, 0, 14, 1.2],
    [ 16, 0, -20, 1.1], [ 16, 0, -8, 0.9], [ 16, 0,  4, 1.3], [ 16, 0, 14, 1.0],
    [-22, 0,   0, 1.2], [-22, 0, 10, 0.9], [ 22, 0,  0, 1.1], [ 22, 0, 10, 1.3],
  ];
  return (
    <>
      {positions.map(([x,, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.28, 3, 7]} />
            <meshStandardMaterial color="#1a0e06" roughness={0.97} />
          </mesh>
          {[0, 1, 2].map(li => (
            <mesh key={li} position={[0, 3.5 + li * 1.2, 0]} castShadow>
              <coneGeometry args={[1.6 - li * 0.35, 2.2, 7]} />
              <meshStandardMaterial color={`hsl(130,${25 + li * 5}%,${8 + li * 2}%)`} roughness={0.96} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

/* ─── Mobile controls ─────────────────────────────────────────── */
function MobileControls({
  moveRef, yawRef,
}: {
  moveRef: React.MutableRefObject<{ f: number; r: number }>;
  yawRef:  React.MutableRefObject<number>;
}) {
  const lStick  = useRef<HTMLDivElement>(null);
  const lTouch  = useRef<number|null>(null);
  const lOrigin = useRef({ x: 0, y: 0 });
  const rTouch  = useRef<number|null>(null);
  const rLast   = useRef({ x: 0, y: 0 });

  function onTouchStart(e: React.TouchEvent) {
    const mid = window.innerWidth / 2;
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < mid && lTouch.current === null) {
        lTouch.current = t.identifier; lOrigin.current = { x: t.clientX, y: t.clientY };
      } else if (t.clientX >= mid && rTouch.current === null) {
        rTouch.current = t.identifier; rLast.current = { x: t.clientX, y: t.clientY };
      }
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lTouch.current) {
        const dx = (t.clientX - lOrigin.current.x) / 45;
        const dy = (t.clientY - lOrigin.current.y) / 45;
        const len = Math.sqrt(dx*dx + dy*dy), c = len > 1 ? 1/len : 1;
        moveRef.current.r = Math.max(-1, Math.min(1, dx * c));
        moveRef.current.f = Math.max(-1, Math.min(1, -dy * c));
        if (lStick.current) lStick.current.style.transform =
          `translate(${Math.min(30, Math.max(-30, dx * 30))}px,${Math.min(30, Math.max(-30, dy * 30))}px)`;
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
        moveRef.current.f = 0; moveRef.current.r = 0;
        lTouch.current = null;
        if (lStick.current) lStick.current.style.transform = "translate(0,0)";
      }
      if (t.identifier === rTouch.current) rTouch.current = null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-20"
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
        <p style={{ fontSize: 9, color: "rgba(201,168,76,0.35)", textAlign: "center", fontFamily: "EB Garamond, serif" }}>drag<br />to look</p>
      </div>
    </div>
  );
}

/* ─── Entry transition ────────────────────────────────────────── */
function EntryTransition({ building, onDone }: { building: typeof BUILDINGS[number]; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, []);
  return (
    <>
      <style>{`
        @keyframes entry-fade-in { from { opacity:0 } to { opacity:1 } }
        @keyframes entry-text-rise { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes door-glow-pulse { 0%,100% { text-shadow:0 0 20px rgba(201,168,76,.5) } 50% { text-shadow:0 0 55px rgba(201,168,76,1),0 0 90px rgba(201,168,76,.35) } }
        @keyframes grow-bar { from { transform:scaleX(0) } to { transform:scaleX(1) } }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "radial-gradient(ellipse at center,rgba(0,0,0,.05) 0%,rgba(0,0,0,.98) 100%)", animation: "entry-fade-in .55s ease-out forwards" }}
      >
        <div style={{ fontSize: 76, marginBottom: 20, animation: "entry-text-rise .5s .25s ease-out both,door-glow-pulse 1.2s .6s ease-in-out infinite" }}>
          {building.icon}
        </div>
        <h2 style={{ fontFamily: "EB Garamond, serif", color: "#c9a84c", fontSize: 30, fontWeight: "bold", letterSpacing: "0.15em", textAlign: "center", whiteSpace: "pre-line", marginBottom: 14, animation: "entry-text-rise .5s .4s ease-out both" }}>
          {building.label}
        </h2>
        <p style={{ fontFamily: "EB Garamond, serif", color: "rgba(201,168,76,.5)", fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase", animation: "entry-text-rise .5s .6s ease-out both" }}>
          Entering…
        </p>
        <div style={{ marginTop: 28, width: 160, height: 2, background: "rgba(201,168,76,.12)", borderRadius: 99, overflow: "hidden", animation: "entry-text-rise .4s .65s ease-out both" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,#c9a84c,#fbbf24)", borderRadius: 99, transformOrigin: "left", animation: "grow-bar 1.6s .2s linear forwards", transform: "scaleX(0)" }} />
        </div>
      </div>
    </>
  );
}
