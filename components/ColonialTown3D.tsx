"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sparkles } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUnlockedProps } from "@/lib/world/levelUnlocks";
import { TOWN_NPCS, getNpcPosition, type TownNpc } from "@/lib/world/npcs";
import { playDoor, startTownAmbient, stopTownAmbient } from "@/lib/sounds";
import WorldGlbModels from "@/components/world/WorldGlbModels";
import { WORLD_ASSETS } from "@/components/world/worldAssets";
import { Building } from "@/components/world/townBuilding";
import { Fountain, HarborWater, InfiniteTerrain, LanternPost, LightRain, Ship, Shoreline, Street, Trees, WorldLighting } from "@/components/world/townEnvironment";
import { UnlockedWorldProp } from "@/components/world/townProps";
import { CelebrationParticles, EntryTransition, MobileTouchControls, OtherPlayer, TownLife } from "@/components/world/townLife";
import { BUILDINGS, CHANNEL, EYE_HEIGHT, FIRST_PERSON_POS, NPC_INTERACTION_DISTANCE, SPEED, START_POS, TIME_LIGHTING, getTimeMode, isBlockedByBuilding, randomWeather, randomWorldTrivia, type BuildingDef, type DialogueState, type PlayerState, type TimeMode, type WeatherMode } from "@/components/world/townConfig";

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
        if (key !== userId && Array.isArray(vals) && vals[0]) out[key] = vals[0] as PlayerState;
      }
      setOthers(out);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ userId, username, avatarIdx, x: 0, z: 27, yaw: 0 });
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
  const [nearNpc, setNearNpc] = useState<TownNpc | null>(null);
  const [dialogue, setDialogue] = useState<DialogueState>(null);
  const [weather, setWeather] = useState<WeatherMode>("clear");
  const [entryCelebration, setEntryCelebration] = useState(0);

  useEffect(() => {
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setWeather(randomWeather());
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
      const { data } = await sb.from("profiles").select("full_name, display_name").eq("user_id", user.id).maybeSingle();
      const name = data?.full_name || data?.display_name;
      if (name) setUsername(name.split(" ")[0]);
    })();
  }, []);

  const { others, broadcast } = useMultiplayer(userId, username, avatarIdx);

  const interact = useCallback(() => {
    if (dialogue) { setDialogue(null); return; }
    if (nearNpc) {
      const useTrivia = Math.random() > (nearNpc.isBen ? 0.58 : 0.72);
      const text = useTrivia ? randomWorldTrivia(!nearNpc.isBen) : nearNpc.lines[Math.floor(Math.random() * nearNpc.lines.length)];
      setDialogue({ npc: nearNpc, text });
      return;
    }
    if (!near || entering) return;
    setEntering(near);
    playDoor();
  }, [dialogue, near, nearNpc, entering]);

  useEffect(() => () => stopTownAmbient(), []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "KeyE") interact();
      if (e.code === "KeyC" && dialogue?.npc.isBen) router.push("/chat");
      if (e.code === "KeyV") setWeather((current) => current === "clear" ? "rain" : current === "rain" ? "fog" : "clear");
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [dialogue, interact, router]);

  function startWorld() {
    setLocked(true);
    setEntryCelebration((value) => value + 1);
    startTownAmbient("harbor");
    if (isMobile) return;
    setTimeout(() => { controlsApiRef.current?.lock?.(); }, 150);
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas dpr={isMobile ? 1 : [1, 1.5]} camera={{ fov: 72, near: 0.1, far: 900, position: START_POS }} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.35 }} shadows={isMobile ? false : { type: THREE.PCFSoftShadowMap }}>
        <Suspense fallback={null}>
          <Scene locked={locked} moveRef={moveRef} mobileYaw={mobileYaw} isMobile={isMobile} nearId={near?.id ?? null} onNear={setNear} onNearNpc={setNearNpc} onLock={setLocked} onControlsReady={(controls: any) => { controlsApiRef.current = controls; }} others={others} broadcast={broadcast} weather={weather} entryCelebration={entryCelebration} />
        </Suspense>
      </Canvas>
      <button type="button" onClick={() => setWeather((current) => current === "clear" ? "rain" : current === "rain" ? "fog" : "clear")} className="absolute right-3 top-14 z-40 rounded-full border border-[#c9a84c]/45 bg-[#100b07]/90 px-3 py-2 text-xs font-bold text-[#f4d675] shadow-lg backdrop-blur" aria-label={`Weather: ${weather}. Change weather`}>
        {weather === "clear" ? "☀ Clear" : weather === "rain" ? "🌦 Light rain" : "🌫 Soft fog"}{!isMobile ? " · V" : ""}
      </button>
      {!locked && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/20 px-4 pb-10">
          <div className="text-center">
            <div className="mb-3 rounded-3xl px-5 py-4" style={{ background: "rgba(8,4,2,0.72)", border: "1px solid rgba(201,168,76,0.45)", color: "#f5e6c8", fontFamily: "EB Garamond, serif", boxShadow: "0 0 40px rgba(0,0,0,.45)" }}>
              <p className="font-cinzel text-xs uppercase tracking-[0.3em]" style={{ color: "#c9a84c" }}>Bird&apos;s-Eye View</p>
              <h2 className="mt-1 text-2xl font-bold">Franklin&apos;s Landing</h2>
              <p className="mt-1 text-sm text-[#d6c09a]">Survey the colony, then enter the streets.</p>
            </div>
            <button type="button" onClick={startWorld} className="font-cinzel rounded-2xl px-8 py-4 text-base font-bold transition-all active:scale-95" style={{ background: "#c9a84c", color: "#1a0f0a", boxShadow: "0 0 34px rgba(201,168,76,0.7)", border: "1px solid rgba(255,255,255,0.35)" }}>Enter Franklin&apos;s Landing</button>
          </div>
        </div>
      )}
      {(locked || isMobile) && (nearNpc || near) && !entering && !dialogue && (
        <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4">
          <button type="button" onClick={interact} className="font-cinzel rounded-2xl px-8 py-4 text-base font-bold transition-transform active:scale-95" style={{ background: "rgba(201,168,76,0.98)", color: "#1a0f0a", boxShadow: "0 0 30px rgba(201,168,76,0.75)", border: "1px solid rgba(255,255,255,0.35)" }}>
            {nearNpc ? `${nearNpc.icon} Speak with ${nearNpc.name}` : `${near!.icon} Enter ${near!.label.replace("\n", " ")}`}{!isMobile ? " — Press E" : ""}
          </button>
        </div>
      )}
      {dialogue && (
        <div className="absolute inset-x-0 bottom-28 z-[60] flex justify-center px-4">
          <section className="w-full max-w-lg rounded-3xl border border-[#c9a84c]/55 bg-[#100b07]/95 p-5 text-[#fff7df] shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">{dialogue.npc.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-cinzel text-xs uppercase tracking-[0.22em] text-[#c9a84c]">{dialogue.npc.name} · {dialogue.npc.role}</p>
                <p className="mt-2 font-cormorant text-lg leading-7">“{dialogue.text}”</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {dialogue.npc.isBen && <button type="button" onClick={() => router.push("/chat")} className="rounded-xl bg-[#c9a84c] px-4 py-2 font-bold text-[#1a0f0a]">Ask Ben{!isMobile ? " · C" : ""}</button>}
              <button type="button" onClick={() => setDialogue(null)} className="rounded-xl border border-[#c9a84c]/35 px-4 py-2 font-bold text-[#f4d675]">Farewell{!isMobile ? " · E" : ""}</button>
            </div>
          </section>
        </div>
      )}
      {(locked || isMobile) && !entering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(201,168,76,0.8)", boxShadow: "0 0 8px rgba(201,168,76,0.6)" }} />
        </div>
      )}
      {isMobile && locked && !entering && <MobileTouchControls moveRef={moveRef} yawRef={mobileYaw} />}
      {entering && <EntryTransition building={entering} onDone={() => { router.push(entering.href); setEntering(null); }} />}
    </div>
  );
}

function Scene({ locked, moveRef, mobileYaw, isMobile, nearId, onNear, onNearNpc, onLock, onControlsReady, others, broadcast, weather, entryCelebration }: {
  locked: boolean; moveRef: React.MutableRefObject<{ f: number; r: number }>; mobileYaw: React.MutableRefObject<number>; isMobile: boolean; nearId: string | null;
  onNear: (b: BuildingDef | null) => void; onNearNpc: (npc: TownNpc | null) => void; onLock: (v: boolean) => void; onControlsReady: (controls: any) => void;
  others: Record<string, PlayerState>; broadcast: (x: number, z: number, yaw: number) => void; weather: WeatherMode; entryCelebration: number;
}) {
  const controlsRef = useRef<any>(null);
  const nearestRef = useRef<BuildingDef | null>(null);
  const nearestNpcRef = useRef<TownNpc | null>(null);
  const introDone = useRef(false);
  const pendingEntryCelebration = useRef(false);
  const previousLevel = useRef<number | null>(null);
  const { camera } = useThree();
  const [playerLevel, setPlayerLevel] = useState(1);
  const [celebration, setCelebration] = useState(0);
  const [timeMode, setTimeMode] = useState<TimeMode>(() => getTimeMode());
  const unlockedProps = useMemo(() => getUnlockedProps(playerLevel), [playerLevel]);

  const isBlocked = useCallback((x: number, z: number) => {
    if (isBlockedByBuilding(x, z)) return true;
    if (WORLD_ASSETS.some((asset) => { const radius = asset.collide ?? 0; return radius ? Math.hypot(x - asset.x, z - asset.z) < radius : false; })) return true;
    return unlockedProps.some((prop) => prop.type === "Cottage" && Math.abs(x - prop.position[0]) < 4.5 && Math.abs(z - prop.position[2]) < 4.5);
  }, [unlockedProps]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: number | null = null;
    const applyLevel = (rawLevel: unknown, celebrate: boolean) => {
      const nextLevel = Math.max(1, Number(rawLevel ?? 1));
      if (!active) return;
      if (celebrate && previousLevel.current !== null && nextLevel > previousLevel.current) setCelebration((value) => value + 1);
      previousLevel.current = nextLevel;
      setPlayerLevel(nextLevel);
    };
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const loadLevel = async (celebrate: boolean) => {
        const { data } = await supabase.from("profiles").select("level").eq("user_id", user.id).maybeSingle();
        applyLevel(data?.level, celebrate);
      };
      await loadLevel(false);
      pollTimer = window.setInterval(() => void loadLevel(true), 15_000);
      channel = supabase.channel(`world-level-${user.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, (payload) => applyLevel(payload.new?.level, true)).subscribe();
    })();
    return () => { active = false; if (pollTimer !== null) window.clearInterval(pollTimer); if (channel) void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { if (entryCelebration > 0) pendingEntryCelebration.current = true; }, [entryCelebration]);
  useEffect(() => { const timer = window.setInterval(() => setTimeMode(getTimeMode()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { camera.position.set(...START_POS); camera.lookAt(0, 0, 0); }, [camera]);
  useEffect(() => {
    if (isMobile || !controlsRef.current) return;
    const c = controlsRef.current;
    onControlsReady(c);
    const lock = () => onLock(true);
    const unlock = () => onLock(false);
    c.addEventListener("lock", lock); c.addEventListener("unlock", unlock);
    return () => { c.removeEventListener("lock", lock); c.removeEventListener("unlock", unlock); };
  }, [isMobile, onControlsReady, onLock]);
  useEffect(() => {
    const keys: Record<string, boolean> = {};
    const sync = () => {
      moveRef.current.f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      moveRef.current.r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => { keys[e.code] = true; sync(); };
    const up = (e: KeyboardEvent) => { keys[e.code] = false; sync(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [moveRef]);

  useFrame((state, delta) => {
    const cam = state.camera;
    const dt = Math.min(delta, 0.05);
    if (!locked) { cam.position.lerp(new THREE.Vector3(0, 70, 70), 0.04); cam.lookAt(0, 0, 0); return; }
    if (!introDone.current && cam.position.y > EYE_HEIGHT + 0.08) {
      const target = new THREE.Vector3(...FIRST_PERSON_POS);
      cam.position.lerp(target, 0.035);
      cam.lookAt(0, 1.4, 0);
      if (cam.position.distanceTo(target) < 0.2) {
        introDone.current = true;
        cam.position.set(...FIRST_PERSON_POS);
        if (pendingEntryCelebration.current) { pendingEntryCelebration.current = false; setCelebration((value) => value + 1); }
      }
      return;
    }
    const { f, r } = moveRef.current;
    if (isMobile) { cam.rotation.order = "YXZ"; cam.rotation.y = mobileYaw.current; }
    if (f !== 0 || r !== 0) {
      const yaw = cam.rotation.y;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const rgt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const dir = new THREE.Vector3().addScaledVector(fwd, f).addScaledVector(rgt, r).normalize().multiplyScalar(SPEED * dt);
      const next = cam.position.clone().add(dir);
      const blockedByBuilding = isBlocked(next.x, next.z);
      const outOfBounds = next.x < -85 || next.x > 85 || next.z < -95 || next.z > 85;
      if (!blockedByBuilding && !outOfBounds) { cam.position.x = next.x; cam.position.z = next.z; }
      else {
        const slideX = cam.position.clone(); slideX.x = next.x;
        if (!isBlocked(slideX.x, slideX.z) && slideX.x > -85 && slideX.x < 85) cam.position.x = slideX.x;
        const slideZ = cam.position.clone(); slideZ.z = next.z;
        if (!isBlocked(slideZ.x, slideZ.z) && slideZ.z > -95 && slideZ.z < 85) cam.position.z = slideZ.z;
      }
    }
    cam.position.y = EYE_HEIGHT;
    broadcast(cam.position.x, cam.position.z, cam.rotation.y);
    let found: BuildingDef | null = null; let best = Infinity;
    for (const b of BUILDINGS) {
      const dist = Math.hypot(cam.position.x - b.x, cam.position.z - b.z);
      if (dist < b.enter && dist < best) { found = b; best = dist; }
    }
    if (nearestRef.current?.id !== found?.id) { nearestRef.current = found; onNear(found); }
    let foundNpc: TownNpc | null = null; let nearestNpcDistance = NPC_INTERACTION_DISTANCE;
    for (const npc of TOWN_NPCS) {
      const position = getNpcPosition(npc, state.clock.elapsedTime);
      const distance = Math.hypot(cam.position.x - position.x, cam.position.z - position.z);
      if (distance < nearestNpcDistance) { foundNpc = npc; nearestNpcDistance = distance; }
    }
    if (nearestNpcRef.current?.id !== foundNpc?.id) { nearestNpcRef.current = foundNpc; onNearNpc(foundNpc); }
  });

  return (
    <>
      <WorldLighting weather={weather} mode={timeMode} isMobile={isMobile} />
      {weather === "rain" && <LightRain isMobile={isMobile} />}
      <Sparkles count={100} scale={[72, 12, 96]} position={[0, 2, 0]} size={1.5} speed={0.3} color="#fbbf24" opacity={0.38} />
      <WorldGlbModels isMobile={isMobile} />
      <InfiniteTerrain />
      <HarborWater />
      <Shoreline />
      <Street />
      {BUILDINGS.map((b) => <Building key={b.id} def={b} active={nearId === b.id} />)}
      {[-22, -14, -6, 2, 10, 18, 26].map((z) => (
        <group key={`lantern-row-${z}`}>
          <LanternPost position={[-3.8, 0, z]} intensity={TIME_LIGHTING[timeMode].lantern} />
          <LanternPost position={[3.8, 0, z]} intensity={TIME_LIGHTING[timeMode].lantern} />
        </group>
      ))}
      <Fountain />
      <TownLife />
      <Trees />
      {unlockedProps.map((prop, index) => <UnlockedWorldProp key={`${prop.type}-${index}`} type={prop.type} position={prop.position} />)}
      <Ship position={[-35, 0, -95]} rotation={0.4} />
      <Ship position={[25, 0, -110]} rotation={-0.6} />
      <Ship position={[-50, 0, -125]} rotation={0.2} />
      <Ship position={[45, 0, -135]} rotation={0.8} />
      {Object.entries(others).map(([id, p]) => <OtherPlayer key={id} x={p.x} z={p.z} yaw={p.yaw} avatarIdx={p.avatarIdx ?? 0} name={p.username ?? "Colonist"} />)}
      {celebration > 0 && <CelebrationParticles key={celebration} isMobile={isMobile} onDone={() => setCelebration(0)} />}
      {!isMobile && <PointerLockControls ref={controlsRef} />}
    </>
  );
}
