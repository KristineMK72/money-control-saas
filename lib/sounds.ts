function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

export function playCoins() {
  const c = ctx(); if (!c) return;
  [0, 0.07, 0.16].forEach((delay, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(900 + i * 120, c.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + delay + 0.22);
    gain.gain.setValueAtTime(0.28, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.25);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + 0.26);
  });
}

export function playSuccess() {
  const c = ctx(); if (!c) return;
  [523, 659, 784, 1046].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = "sine"; osc.frequency.value = freq;
    const t = c.currentTime + i * 0.11;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.start(t); osc.stop(t + 0.46);
  });
}

export function playLevelUp() {
  const c = ctx(); if (!c) return;
  [261, 329, 392, 523, 659, 784, 1046].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = "sine"; osc.frequency.value = freq;
    const t = c.currentTime + i * 0.075;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.36);
  });
}

export function playError() {
  const c = ctx(); if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.28);
  gain.gain.setValueAtTime(0.14, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.31);
}

export function playWrite() {
  const c = ctx(); if (!c) return;
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, sr * 0.12, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass"; filter.frequency.value = 3500; filter.Q.value = 0.4;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  src.connect(filter); filter.connect(gain); gain.connect(c.destination);
  src.start();
}

export function playCashRegister() {
  const c = ctx(); if (!c) return;
  [1100, 1500].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = "sine"; osc.frequency.value = freq;
    const t = c.currentTime + i * 0.09;
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.start(t); osc.stop(t + 0.56);
  });
}

export function playBell() {
  const c = ctx(); if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = "sine"; osc.frequency.value = 740;
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.91);
}
