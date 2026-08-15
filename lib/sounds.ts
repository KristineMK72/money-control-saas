let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambient: { nodes: AudioScheduledSourceNode[]; gain: GainNode } | null = null;
let enabled = true;
let volume = 0.7;
let preferencesLoaded = false;
let unlockPromise: Promise<boolean> | null = null;

export type SoundPreferences = {
  enabled: boolean;
  volume: number;
};

function loadPreferences() {
  if (preferencesLoaded || typeof window === "undefined") return;
  preferencesLoaded = true;
  enabled = window.localStorage.getItem("askben:sound-enabled") !== "false";
  const storedVolume = window.localStorage.getItem("askben:sound-volume");
  if (storedVolume !== null) {
    const savedVolume = Number(storedVolume);
    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
      volume = savedVolume;
    }
  }
}

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  loadPreferences();
  const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) {
    audioContext = new AudioCtor();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
  }
  if (masterGain) masterGain.gain.value = enabled ? volume : 0;
  return audioContext;
}

function output(c: AudioContext) {
  if (!masterGain) {
    masterGain = c.createGain();
    masterGain.connect(c.destination);
  }
  return masterGain;
}

function announceAudioUnlocked() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("askben:audio-unlocked"));
}

export function getSoundPreferences(): SoundPreferences {
  loadPreferences();
  return { enabled, volume };
}

export function isAudioReady() {
  return audioContext?.state === "running";
}

export async function initAudio(): Promise<boolean> {
  const c = ctx();
  if (!c) return false;
  if (c.state === "running") return true;
  if (unlockPromise) return unlockPromise;

  unlockPromise = c
    .resume()
    .then(() => {
      if (c.state !== "running") return false;

      // A one-frame silent source completes Web Audio activation on iOS Safari.
      const buffer = c.createBuffer(1, 1, c.sampleRate);
      const source = c.createBufferSource();
      source.buffer = buffer;
      source.connect(output(c));
      source.start(0);
      announceAudioUnlocked();
      return true;
    })
    .catch(() => false)
    .finally(() => {
      unlockPromise = null;
    });

  return unlockPromise;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  preferencesLoaded = true;
  if (typeof window !== "undefined") window.localStorage.setItem("askben:sound-enabled", String(on));
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(on ? volume : 0, audioContext.currentTime, 0.03);
  }
  if (on) void initAudio();
}

export function setSoundVolume(nextVolume: number) {
  volume = Math.max(0, Math.min(1, nextVolume));
  preferencesLoaded = true;
  if (typeof window !== "undefined") window.localStorage.setItem("askben:sound-volume", String(volume));
  if (masterGain && audioContext && enabled) {
    masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.03);
  }
}

export function speakBen(text: string): boolean {
  loadPreferences();
  if (
    !enabled ||
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return false;
  }

  const cleanText = text
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2_000);
  if (!cleanText) return false;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.92;
  utterance.pitch = 0.86;
  utterance.volume = volume;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice =
    voices.find(
      (voice) =>
        /^en(-|_)/i.test(voice.lang) &&
        /daniel|arthur|alex|fred|guy|david|male/i.test(voice.name)
    ) ?? voices.find((voice) => /^en(-|_)/i.test(voice.lang)) ?? null;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopBenVoice() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function playClick() {
  const c = ctx(); if (!c || !enabled) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(output(c));
  osc.type = "sine"; osc.frequency.value = 520;
  gain.gain.setValueAtTime(0.035, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.045);
  osc.start(); osc.stop(c.currentTime + 0.05);
}

export function playCoins() {
  const c = ctx(); if (!c || !enabled) return;
  [0, 0.07, 0.16].forEach((delay, i) => {
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.connect(gain); gain.connect(output(c)); osc.type = "sine";
    osc.frequency.setValueAtTime(900 + i * 120, c.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + delay + 0.22);
    gain.gain.setValueAtTime(0.28, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.25);
    osc.start(c.currentTime + delay); osc.stop(c.currentTime + delay + 0.26);
  });
}

export function playSuccess() {
  const c = ctx(); if (!c || !enabled) return;
  [523, 659, 784, 1046].forEach((freq, i) => {
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.connect(gain); gain.connect(output(c)); osc.type = "sine"; osc.frequency.value = freq;
    const t = c.currentTime + i * 0.11;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.start(t); osc.stop(t + 0.46);
  });
}

export function playLevelUp() {
  const c = ctx(); if (!c || !enabled) return;
  [261, 329, 392, 523, 659, 784, 1046].forEach((freq, i) => {
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.connect(gain); gain.connect(output(c)); osc.type = "sine"; osc.frequency.value = freq;
    const t = c.currentTime + i * 0.075;
    gain.gain.setValueAtTime(0.18, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.36);
  });
}

export function playXpGain() {
  const c = ctx(); if (!c || !enabled) return;
  [523, 659].forEach((freq, i) => {
    const osc = c.createOscillator(); const gain = c.createGain(); const t = c.currentTime + i * 0.1;
    osc.connect(gain); gain.connect(output(c)); osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.16, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.start(t); osc.stop(t + 0.29);
  });
}

export function playError() {
  const c = ctx(); if (!c || !enabled) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(output(c)); osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.28);
  gain.gain.setValueAtTime(0.14, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.start(); osc.stop(c.currentTime + 0.31);
}

export function playWrite() {
  const c = ctx(); if (!c || !enabled) return;
  const buf = c.createBuffer(1, c.sampleRate * 0.12, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); const filter = c.createBiquadFilter(); const gain = c.createGain();
  src.buffer = buf; filter.type = "bandpass"; filter.frequency.value = 3500; filter.Q.value = 0.4;
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  src.connect(filter); filter.connect(gain); gain.connect(output(c)); src.start();
}

export function playCashRegister() {
  const c = ctx(); if (!c || !enabled) return;
  [1100, 1500].forEach((freq, i) => {
    const osc = c.createOscillator(); const gain = c.createGain(); const t = c.currentTime + i * 0.09;
    osc.connect(gain); gain.connect(output(c)); osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.28, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.start(t); osc.stop(t + 0.56);
  });
}

export function playBell() {
  const c = ctx(); if (!c || !enabled) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(output(c)); osc.type = "sine"; osc.frequency.value = 740;
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
  osc.start(); osc.stop(c.currentTime + 0.91);
}

export function playDoor() {
  const c = ctx(); if (!c || !enabled) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.connect(gain); gain.connect(output(c)); osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(65, c.currentTime + 0.65);
  gain.gain.setValueAtTime(0.001, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.14, c.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
  osc.start(); osc.stop(c.currentTime + 0.71);
}

export function playThunder() {
  const c = ctx(); if (!c || !enabled) return;
  const source = c.createBufferSource(); const filter = c.createBiquadFilter(); const gain = c.createGain();
  const buffer = c.createBuffer(1, c.sampleRate * 1.4, c.sampleRate); const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  source.buffer = buffer; filter.type = "lowpass"; filter.frequency.value = 180;
  gain.gain.setValueAtTime(0.18, c.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.35);
  source.connect(filter); filter.connect(gain); gain.connect(output(c)); source.start();
}

export function startTownAmbient(mood: "town" | "storm" | "harbor" = "town") {
  stopTownAmbient();
  const c = ctx(); if (!c || !enabled) return;
  const ambientGain = c.createGain();
  ambientGain.gain.value = 0.001; ambientGain.connect(output(c));

  const hum = c.createOscillator(); const humFilter = c.createBiquadFilter();
  hum.type = "sine"; hum.frequency.value = mood === "harbor" ? 92 : mood === "storm" ? 48 : 72;
  humFilter.type = "lowpass"; humFilter.frequency.value = 160;
  hum.connect(humFilter); humFilter.connect(ambientGain); hum.start();

  const noise = c.createBufferSource(); const noiseFilter = c.createBiquadFilter();
  const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer; noise.loop = true; noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = mood === "storm" ? 240 : 520; noiseFilter.Q.value = 0.35;
  noise.connect(noiseFilter); noiseFilter.connect(ambientGain); noise.start();

  ambientGain.gain.exponentialRampToValueAtTime(mood === "storm" ? 0.06 : 0.025, c.currentTime + 1.2);
  ambient = { nodes: [hum, noise], gain: ambientGain };
}

export function stopTownAmbient() {
  if (!ambient || !audioContext) return;
  const current = ambient;
  current.gain.gain.setTargetAtTime(0.001, audioContext.currentTime, 0.12);
  window.setTimeout(() => current.nodes.forEach((node) => { try { node.stop(); } catch {} }), 500);
  ambient = null;
}
