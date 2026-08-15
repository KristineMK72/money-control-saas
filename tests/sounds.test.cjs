const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

class FakeAudioParam {
  constructor(value = 0) {
    this.value = value;
  }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
}

class FakeNode {
  connect() { return this; }
  start() { FakeAudioContext.starts += 1; }
  stop() {}
}

class FakeAudioContext {
  static instances = [];
  static starts = 0;

  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.sampleRate = 100;
    this.destination = new FakeNode();
    FakeAudioContext.instances.push(this);
  }

  async resume() {
    this.state = "running";
  }

  createGain() {
    const node = new FakeNode();
    node.gain = new FakeAudioParam(1);
    return node;
  }

  createOscillator() {
    const node = new FakeNode();
    node.frequency = new FakeAudioParam();
    node.type = "sine";
    return node;
  }

  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }

  createBufferSource() {
    const node = new FakeNode();
    node.buffer = null;
    node.loop = false;
    return node;
  }

  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeAudioParam();
    node.Q = new FakeAudioParam();
    node.type = "lowpass";
    return node;
  }
}

const storage = new Map();
const spoken = [];
global.CustomEvent = class CustomEvent {
  constructor(type) { this.type = type; }
};
global.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  constructor(text) { this.text = text; }
};
global.window = {
  AudioContext: FakeAudioContext,
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  dispatchEvent: () => true,
  setTimeout,
  speechSynthesis: {
    cancel: () => {},
    getVoices: () => [{ name: "Daniel", lang: "en-US" }],
    speak: (utterance) => spoken.push(utterance),
  },
};

const sounds = require("../lib/sounds.ts");

test("audio unlock resumes one shared context", async () => {
  assert.equal(sounds.isAudioReady(), false);
  assert.equal(await sounds.initAudio(), true);
  assert.equal(sounds.isAudioReady(), true);
  assert.equal(FakeAudioContext.instances.length, 1);
  assert.equal(await sounds.initAudio(), true);
  assert.equal(FakeAudioContext.instances.length, 1);
});

test("all procedural effects schedule without audio assets", () => {
  const before = FakeAudioContext.starts;
  sounds.playClick();
  sounds.playCoins();
  sounds.playSuccess();
  sounds.playLevelUp();
  sounds.playXpGain();
  sounds.playError();
  sounds.playWrite();
  sounds.playCashRegister();
  sounds.playBell();
  sounds.playDoor();
  sounds.playThunder();
  sounds.startTownAmbient("harbor");
  assert.ok(FakeAudioContext.starts > before);
  sounds.stopTownAmbient();
});

test("mute and volume preferences persist", () => {
  sounds.setSoundVolume(0.35);
  assert.equal(sounds.getSoundPreferences().volume, 0.35);
  assert.equal(storage.get("askben:sound-volume"), "0.35");

  sounds.setSoundEnabled(false);
  const before = FakeAudioContext.starts;
  sounds.playCoins();
  assert.equal(FakeAudioContext.starts, before);
  assert.equal(storage.get("askben:sound-enabled"), "false");

  sounds.setSoundEnabled(true);
  assert.equal(sounds.getSoundPreferences().enabled, true);
});

test("Ben read-aloud uses the saved volume and strips markdown", () => {
  assert.equal(sounds.speakBen("**TOP PRIORITY** — Save today."), true);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "TOP PRIORITY — Save today.");
  assert.equal(spoken[0].volume, 0.35);
  assert.equal(spoken[0].voice.name, "Daniel");
});
