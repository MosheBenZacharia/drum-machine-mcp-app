/**
 * Drum Machine MCP App — UI Logic
 * Tone.js audio engine + step sequencer grid + MCP Apps SDK integration
 */
import { App } from "@modelcontextprotocol/ext-apps";
import "./styles.css";

// Tone.js is loaded globally via CDN in the HTML
// Types declared in src/tone.d.ts

// --- Types ---
type InstrumentName = "hihat" | "clap" | "rimshot" | "snare" | "tom" | "kick";
type StepState = 0 | 1 | 2; // 0=off, 1=normal, 2=accent

interface DrumPattern {
  [key: string]: boolean[];
}

interface PatternData {
  bpm?: number;
  pattern?: DrumPattern;
  swing?: number;
}

interface Preset {
  bpm: number;
  swing: number;
  pattern: Record<InstrumentName, StepState[]>;
}

// --- Constants ---
const INSTRUMENTS: InstrumentName[] = ["hihat", "clap", "rimshot", "snare", "tom", "kick"];
const STEPS = 16;
const ACCENT_VELOCITY = 1.0;
const NORMAL_VELOCITY = 0.6;

// --- Genre Presets ---
const _ = 0, x = 1, X = 2; // shorthand: off, normal, accent
const PRESETS: Record<string, Preset> = {
  "boom-bap": {
    bpm: 90, swing: 0.3,
    pattern: {
      hihat:   [x,_,x,_, x,_,x,_, x,_,x,_, x,_,x,_],
      clap:    [_,_,_,_, X,_,_,_, _,_,_,_, X,_,_,_],
      rimshot: [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      snare:   [_,_,_,_, x,_,_,_, _,_,_,_, x,_,_,_],
      tom:     [_,_,_,_, _,_,_,_, _,_,_,x, _,_,_,_],
      kick:    [X,_,_,_, _,_,x,_, X,_,_,_, _,_,x,_],
    },
  },
  "house": {
    bpm: 124, swing: 0,
    pattern: {
      hihat:   [_,_,x,_, _,_,x,_, _,_,x,_, _,_,x,_],
      clap:    [_,_,_,_, X,_,_,_, _,_,_,_, X,_,_,_],
      rimshot: [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      snare:   [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      tom:     [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      kick:    [X,_,_,_, X,_,_,_, X,_,_,_, X,_,_,_],
    },
  },
  "techno": {
    bpm: 135, swing: 0,
    pattern: {
      hihat:   [x,_,x,_, x,_,x,_, x,_,x,_, x,_,x,_],
      clap:    [_,_,_,_, X,_,_,_, _,_,_,_, X,_,_,x],
      rimshot: [_,_,x,_, _,_,_,x, _,_,x,_, _,_,_,x],
      snare:   [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      tom:     [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      kick:    [X,_,_,_, X,_,_,_, X,_,_,_, X,_,_,_],
    },
  },
  "reggaeton": {
    bpm: 95, swing: 0,
    pattern: {
      hihat:   [x,_,_,x, _,_,x,_, _,x,_,_, x,_,_,x],
      clap:    [_,_,_,_, X,_,_,_, _,_,_,_, X,_,_,_],
      rimshot: [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      snare:   [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      tom:     [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      kick:    [X,_,_,x, _,_,x,_, X,_,_,x, _,_,x,_],
    },
  },
  "dnb": {
    bpm: 174, swing: 0,
    pattern: {
      hihat:   [x,_,x,x, _,_,x,_, x,_,x,x, _,_,x,_],
      clap:    [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      rimshot: [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      snare:   [_,_,_,_, X,_,_,_, _,_,_,_, X,_,_,x],
      tom:     [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      kick:    [X,_,_,_, _,_,_,_, _,_,x,_, _,_,_,_],
    },
  },
  "rock": {
    bpm: 120, swing: 0,
    pattern: {
      hihat:   [X,_,x,_, X,_,x,_, X,_,x,_, X,_,x,_],
      clap:    [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      rimshot: [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_],
      snare:   [_,_,_,_, X,_,_,_, _,_,_,_, X,_,_,_],
      tom:     [_,_,_,_, _,_,_,_, _,_,_,_, _,_,x,x],
      kick:    [X,_,_,_, _,_,X,_, X,_,_,_, _,_,_,_],
    },
  },
};

// --- State ---
const pattern: Record<InstrumentName, StepState[]> = {
  hihat:   new Array(STEPS).fill(0),
  clap:    new Array(STEPS).fill(0),
  rimshot: new Array(STEPS).fill(0),
  snare:   new Array(STEPS).fill(0),
  tom:     new Array(STEPS).fill(0),
  kick:    new Array(STEPS).fill(0),
};

const muted: Record<InstrumentName, boolean> = {
  hihat: false, clap: false, rimshot: false, snare: false, tom: false, kick: false,
};

const soloed: Record<InstrumentName, boolean> = {
  hihat: false, clap: false, rimshot: false, snare: false, tom: false, kick: false,
};

let currentStep = -1;
let isPlaying = false;
let currentBPM = 120;
let currentSwing = 0;
let sequenceId: number | null = null;
let anySoloed = false;

// --- DOM References ---
const gridEl = document.getElementById("sequencer-grid")!;
const playBtn = document.getElementById("play-btn")!;
const playIcon = document.getElementById("play-icon")!;
const stopIcon = document.getElementById("stop-icon")!;
const clearBtn = document.getElementById("clear-btn")!;
const bpmDisplay = document.getElementById("bpm-display")!;
const bpmDown = document.getElementById("bpm-down")!;
const bpmUp = document.getElementById("bpm-up")!;
const swingSlider = document.getElementById("swing-slider") as HTMLInputElement;
const swingValue = document.getElementById("swing-value")!;
const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;
const presetSelect = document.getElementById("preset-select") as HTMLSelectElement;
const oscilloscopeCanvas = document.getElementById("oscilloscope") as HTMLCanvasElement;

// Pad element references: padEls[instrument][step]
const padEls: Record<InstrumentName, HTMLElement[]> = {
  hihat: [], clap: [], rimshot: [], snare: [], tom: [], kick: [],
};

// --- Audio Engine (Tone.js) ---
let kickSynth: InstanceType<typeof Tone.MembraneSynth>;
let snareSynth: InstanceType<typeof Tone.NoiseSynth>;
let snareBody: InstanceType<typeof Tone.MembraneSynth>;
let hihatSynth: InstanceType<typeof Tone.NoiseSynth>;
let clapSynth: InstanceType<typeof Tone.NoiseSynth>;
let tomSynth: InstanceType<typeof Tone.MembraneSynth>;
let rimshotSynth: InstanceType<typeof Tone.NoiseSynth>;
let masterVol: InstanceType<typeof Tone.Volume>;
let analyser: AnalyserNode;

function initAudio() {
  masterVol = new Tone.Volume(-6).toDestination();

  // Create analyser for oscilloscope
  const ctx = Tone.getContext().rawContext as AudioContext;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  masterVol.connect(analyser as unknown as AudioNode);

  kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).connect(masterVol);

  snareBody = new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 4,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
  }).connect(masterVol);

  snareSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
  }).connect(masterVol);

  const hihatFilter = new Tone.Filter({ frequency: 8000, type: "highpass", Q: 0.5 }).connect(masterVol);
  hihatSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
  }).connect(hihatFilter);
  hihatSynth.volume.value = 4;

  const clapFilter = new Tone.Filter({ frequency: 2500, type: "bandpass", Q: 2 }).connect(masterVol);
  clapSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.08 },
  }).connect(clapFilter);

  tomSynth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 3,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
  }).connect(masterVol);

  const rimshotFilter = new Tone.Filter({ frequency: 4000, type: "bandpass", Q: 1 }).connect(masterVol);
  rimshotSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.03 },
  }).connect(rimshotFilter);
  rimshotSynth.volume.value = 6;
}

function triggerInstrument(name: InstrumentName, time: number, velocity: number) {
  switch (name) {
    case "kick":
      kickSynth.triggerAttackRelease("C1", "8n", time, velocity);
      break;
    case "snare":
      snareBody.triggerAttackRelease("E2", "16n", time, velocity);
      snareSynth.triggerAttackRelease("16n", time, velocity);
      break;
    case "hihat":
      hihatSynth.triggerAttackRelease("32n", time, velocity);
      break;
    case "clap":
      clapSynth.triggerAttackRelease("16n", time, velocity);
      break;
    case "tom":
      tomSynth.triggerAttackRelease("G2", "8n", time, velocity);
      break;
    case "rimshot":
      rimshotSynth.triggerAttackRelease("32n", time, velocity);
      break;
  }
}

// --- Solo/Mute Logic ---
function isInstrumentAudible(inst: InstrumentName): boolean {
  if (muted[inst]) return false;
  if (anySoloed && !soloed[inst]) return false;
  return true;
}

function updateAnySoloed() {
  anySoloed = INSTRUMENTS.some(inst => soloed[inst]);
}

// --- Build the Sequencer Grid ---
function buildGrid() {
  gridEl.innerHTML = "";

  // Step number indicators
  const indicators = document.createElement("div");
  indicators.className = "step-indicators";
  for (let s = 0; s < STEPS; s++) {
    if (s > 0 && s % 4 === 0) {
      const spacer = document.createElement("span");
      spacer.className = "pad-spacer";
      indicators.appendChild(spacer);
    }
    const num = document.createElement("span");
    num.className = "step-num";
    num.textContent = String(s + 1);
    indicators.appendChild(num);
  }
  gridEl.appendChild(indicators);

  // Instrument rows
  for (const inst of INSTRUMENTS) {
    const row = document.createElement("div");
    row.className = `instrument-row row-${inst}`;

    // Solo/Mute buttons
    const smContainer = document.createElement("div");
    smContainer.className = "solo-mute";

    const soloBtn = document.createElement("button");
    soloBtn.className = "sm-btn solo-btn";
    soloBtn.textContent = "S";
    soloBtn.title = "Solo";
    soloBtn.addEventListener("click", () => {
      soloed[inst] = !soloed[inst];
      soloBtn.classList.toggle("active", soloed[inst]);
      updateAnySoloed();
      updateRowDimming();
    });

    const muteBtn = document.createElement("button");
    muteBtn.className = "sm-btn mute-btn";
    muteBtn.textContent = "M";
    muteBtn.title = "Mute";
    muteBtn.addEventListener("click", () => {
      muted[inst] = !muted[inst];
      muteBtn.classList.toggle("active", muted[inst]);
      updateRowDimming();
    });

    smContainer.appendChild(soloBtn);
    smContainer.appendChild(muteBtn);
    row.appendChild(smContainer);

    const label = document.createElement("div");
    label.className = "instrument-label";
    label.textContent = inst;
    row.appendChild(label);

    const stepsContainer = document.createElement("div");
    stepsContainer.className = "steps-container";

    padEls[inst] = [];

    for (let s = 0; s < STEPS; s++) {
      if (s > 0 && s % 4 === 0) {
        const spacer = document.createElement("div");
        spacer.className = "pad-spacer";
        stepsContainer.appendChild(spacer);
      }

      const pad = document.createElement("div");
      pad.className = "pad";
      applyPadState(pad, pattern[inst][s]);

      pad.addEventListener("click", (e) => {
        const isShift = e.shiftKey;
        const current = pattern[inst][s];

        if (current === 0) {
          // Off -> normal or accent
          pattern[inst][s] = isShift ? 2 : 1;
        } else if (current === 1 && isShift) {
          // Normal + shift -> accent
          pattern[inst][s] = 2;
        } else if (current === 2 && isShift) {
          // Accent + shift -> normal
          pattern[inst][s] = 1;
        } else {
          // Active -> off
          pattern[inst][s] = 0;
        }

        applyPadState(pad, pattern[inst][s]);
        presetSelect.value = "custom";
        syncToModel();
      });

      stepsContainer.appendChild(pad);
      padEls[inst].push(pad);
    }

    row.appendChild(stepsContainer);
    gridEl.appendChild(row);
  }
}

function applyPadState(pad: HTMLElement, state: StepState) {
  pad.classList.remove("active", "accent");
  if (state === 1) pad.classList.add("active");
  if (state === 2) pad.classList.add("active", "accent");
}

function updateRowDimming() {
  for (const inst of INSTRUMENTS) {
    const row = document.querySelector(`.row-${inst}`) as HTMLElement;
    if (row) {
      row.classList.toggle("dimmed", !isInstrumentAudible(inst));
    }
  }
}

// --- Oscilloscope ---
function drawOscilloscope() {
  const ctx = oscilloscopeCanvas.getContext("2d")!;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);

    // Match canvas resolution to its CSS size
    const rect = oscilloscopeCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width * dpr;
    const h = rect.height * dpr;
    if (oscilloscopeCanvas.width !== w || oscilloscopeCanvas.height !== h) {
      oscilloscopeCanvas.width = w;
      oscilloscopeCanvas.height = h;
    }

    analyser.getByteTimeDomainData(dataArray);
    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeStyle = "#2ecc71";
    ctx.shadowColor = "#2ecc71";
    ctx.shadowBlur = 4 * dpr;
    ctx.beginPath();

    const sliceWidth = w / bufferLength;
    let xPos = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(xPos, y);
      else ctx.lineTo(xPos, y);
      xPos += sliceWidth;
    }

    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  draw();
}

// --- Playhead & Step Sequencing ---
function stepCallback(time: number, step: number) {
  for (const inst of INSTRUMENTS) {
    if (pattern[inst][step] && isInstrumentAudible(inst)) {
      const velocity = pattern[inst][step] === 2 ? ACCENT_VELOCITY : NORMAL_VELOCITY;
      triggerInstrument(inst, time, velocity);
    }
  }

  Tone.getDraw().schedule(() => {
    if (currentStep >= 0) {
      for (const inst of INSTRUMENTS) {
        padEls[inst][currentStep].classList.remove("current-step");
      }
    }

    currentStep = step;

    for (const inst of INSTRUMENTS) {
      const pad = padEls[inst][step];
      pad.classList.add("current-step");

      if (pattern[inst][step]) {
        pad.classList.remove("flash");
        void pad.offsetWidth;
        pad.classList.add("flash");
      }
    }
  }, time);
}

function startPlayback() {
  if (isPlaying) return;

  Tone.getTransport().bpm.value = currentBPM;
  Tone.getTransport().swing = currentSwing;
  Tone.getTransport().swingSubdivision = "16n";

  let step = 0;
  sequenceId = Tone.getTransport().scheduleRepeat((time: number) => {
    stepCallback(time, step % STEPS);
    step++;
  }, "16n");

  Tone.getTransport().start();
  isPlaying = true;
  updatePlayButton();
}

function stopPlayback() {
  if (!isPlaying) return;

  Tone.getTransport().stop();
  if (sequenceId !== null) {
    Tone.getTransport().clear(sequenceId);
    sequenceId = null;
  }

  if (currentStep >= 0) {
    for (const inst of INSTRUMENTS) {
      padEls[inst][currentStep].classList.remove("current-step", "flash");
    }
  }
  currentStep = -1;
  isPlaying = false;
  updatePlayButton();
}

function updatePlayButton() {
  playIcon.style.display = isPlaying ? "none" : "block";
  stopIcon.style.display = isPlaying ? "block" : "none";
  playBtn.classList.toggle("playing", isPlaying);
}

// --- Slider Fill ---
function updateSliderFill(slider: HTMLInputElement) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
  slider.style.setProperty("--fill", `${pct}%`);
}

// --- Controls ---
function setBPM(bpm: number) {
  currentBPM = Math.max(40, Math.min(200, Math.round(bpm)));
  bpmDisplay.textContent = String(currentBPM);
  if (isPlaying) {
    Tone.getTransport().bpm.value = currentBPM;
  }
}

function setSwing(value: number) {
  currentSwing = Math.max(0, Math.min(1, value));
  swingSlider.value = String(Math.round(currentSwing * 100));
  updateSliderFill(swingSlider);
  swingValue.textContent = `${Math.round(currentSwing * 100)}%`;
  if (isPlaying) {
    Tone.getTransport().swing = currentSwing;
  }
}

function setVolume(pct: number) {
  const db = pct <= 0 ? -Infinity : -40 + (pct / 100) * 40;
  masterVol.volume.value = db;
}

function clearAll() {
  for (const inst of INSTRUMENTS) {
    for (let s = 0; s < STEPS; s++) {
      pattern[inst][s] = 0;
      applyPadState(padEls[inst][s], 0);
    }
  }
  presetSelect.value = "custom";
  syncToModel();
}

function loadPreset(name: string) {
  const preset = PRESETS[name];
  if (!preset) return;

  setBPM(preset.bpm);
  setSwing(preset.swing);

  for (const inst of INSTRUMENTS) {
    const steps = preset.pattern[inst];
    for (let s = 0; s < STEPS; s++) {
      pattern[inst][s] = steps[s];
      if (padEls[inst][s]) {
        applyPadState(padEls[inst][s], steps[s]);
      }
    }
  }
  syncToModel();
}

// --- Load Pattern Data (from MCP tool) ---
function loadPattern(data: PatternData) {
  if (data.bpm != null) setBPM(data.bpm);
  if (data.swing != null) setSwing(data.swing);
  if (data.pattern) {
    for (const inst of INSTRUMENTS) {
      const steps = data.pattern[inst];
      if (Array.isArray(steps)) {
        for (let s = 0; s < STEPS; s++) {
          // MCP sends booleans, convert to StepState
          pattern[inst][s] = steps[s] ? 1 : 0;
          if (padEls[inst][s]) {
            applyPadState(padEls[inst][s], pattern[inst][s]);
          }
        }
      }
    }
  }
}

// --- Event Listeners ---
playBtn.addEventListener("click", async () => {
  await Tone.start();
  if (isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
});

clearBtn.addEventListener("click", clearAll);

bpmDown.addEventListener("click", () => {
  setBPM(currentBPM - 5);
  syncToModel();
});

bpmUp.addEventListener("click", () => {
  setBPM(currentBPM + 5);
  syncToModel();
});

swingSlider.addEventListener("input", () => {
  setSwing(parseInt(swingSlider.value, 10) / 100);
  syncToModel();
});

volumeSlider.addEventListener("input", () => {
  setVolume(parseInt(volumeSlider.value, 10));
  updateSliderFill(volumeSlider);
});

presetSelect.addEventListener("change", () => {
  const val = presetSelect.value;
  if (val !== "custom") {
    loadPreset(val);
  }
});

// --- MCP App SDK ---
const app = new App({ name: "Drum Machine", version: "1.0.0" });

app.onteardown = async () => {
  stopPlayback();
  return {};
};

app.ontoolinput = (params) => {
  const args = params.arguments as PatternData | undefined;
  if (args) loadPattern(args);
};

app.ontoolresult = (result) => {
  const data = result.structuredContent as PatternData | undefined;
  if (data) loadPattern(data);
};

app.ontoolinputpartial = (params) => {
  try {
    const partial = params.arguments as PatternData | undefined;
    if (!partial) return;
    if (partial.bpm != null) setBPM(partial.bpm);
    if (partial.swing != null) setSwing(partial.swing);
    if (partial.pattern) {
      for (const inst of INSTRUMENTS) {
        const steps = partial.pattern[inst];
        if (Array.isArray(steps)) {
          for (let s = 0; s < steps.length && s < STEPS; s++) {
            pattern[inst][s] = steps[s] ? 1 : 0;
            if (padEls[inst][s]) {
              applyPadState(padEls[inst][s], pattern[inst][s]);
            }
          }
        }
      }
    }
  } catch {
    // Partial JSON may be incomplete
  }
};

app.ontoolcancelled = () => {
  stopPlayback();
};

app.onerror = console.error;

function countActiveSteps(): number {
  let count = 0;
  for (const inst of INSTRUMENTS) {
    for (let s = 0; s < STEPS; s++) {
      if (pattern[inst][s]) count++;
    }
  }
  return count;
}

async function syncToModel() {
  try {
    await app.updateModelContext({
      content: [{
        type: "text",
        text: `---\nbpm: ${currentBPM}\nswing: ${currentSwing}\nactive-steps: ${countActiveSteps()}\n---\nUser's current drum pattern configuration.`,
      }],
    });
  } catch {
    // Host may not support updateModelContext
  }
}

// --- Init ---
initAudio();
buildGrid();
setVolume(75);
updateSliderFill(swingSlider);
updateSliderFill(volumeSlider);
drawOscilloscope();

// Load default preset
loadPreset("boom-bap");

app.connect().then(() => {
  // Host connected
});
