/**
 * Drum Sequencer MCP App — UI Logic
 * Tone.js audio engine + step sequencer grid + MCP Apps SDK integration
 */
import { App } from "@modelcontextprotocol/ext-apps";
import "./styles.css";

// Tone.js is loaded globally via CDN in the HTML
// Types declared in src/tone.d.ts

// --- Types ---
type InstrumentName = "hihat" | "clap" | "rimshot" | "snare" | "tom" | "kick";

interface DrumPattern {
  [key: string]: boolean[];
}

interface PatternData {
  bpm?: number;
  pattern?: DrumPattern;
  swing?: number;
}

// --- Constants ---
const INSTRUMENTS: InstrumentName[] = ["hihat", "clap", "rimshot", "snare", "tom", "kick"];
const STEPS = 16;

// --- State ---
const pattern: Record<InstrumentName, boolean[]> = {
  hihat:   new Array(STEPS).fill(false),
  clap:    new Array(STEPS).fill(false),
  rimshot: new Array(STEPS).fill(false),
  snare:   new Array(STEPS).fill(false),
  tom:     new Array(STEPS).fill(false),
  kick:    new Array(STEPS).fill(false),
};

let currentStep = -1;
let isPlaying = false;
let currentBPM = 120;
let currentSwing = 0;
let sequenceId: number | null = null;

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

// Pad element references: padEls[instrument][step]
const padEls: Record<InstrumentName, HTMLElement[]> = {
  hihat: [], clap: [], rimshot: [], snare: [], tom: [], kick: [],
};

// --- Audio Engine (Tone.js) ---
let kickSynth: InstanceType<typeof Tone.MembraneSynth>;
let snareSynth: InstanceType<typeof Tone.NoiseSynth>;
let snareBody: InstanceType<typeof Tone.MembraneSynth>;
let hihatSynth: InstanceType<typeof Tone.MetalSynth>;
let clapSynth: InstanceType<typeof Tone.NoiseSynth>;
let tomSynth: InstanceType<typeof Tone.MembraneSynth>;
let rimshotSynth: InstanceType<typeof Tone.NoiseSynth>;
let masterVol: InstanceType<typeof Tone.Volume>;

function initAudio() {
  masterVol = new Tone.Volume(-6).toDestination();

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

  hihatSynth = new Tone.MetalSynth({
    frequency: 400,
    envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(masterVol);
  hihatSynth.volume.value = -6;

  const clapFilter = new Tone.Filter({ frequency: 2500, type: "bandpass", Q: 2 }).connect(masterVol);
  clapSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.08 },
  }).connect(clapFilter);

  tomSynth = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 4,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
  }).connect(masterVol);

  const rimshotFilter = new Tone.Filter({ frequency: 5000, type: "bandpass", Q: 3 }).connect(masterVol);
  rimshotSynth = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
  }).connect(rimshotFilter);
}

function triggerInstrument(name: InstrumentName, time: number) {
  switch (name) {
    case "kick":
      kickSynth.triggerAttackRelease("C1", "8n", time);
      break;
    case "snare":
      snareBody.triggerAttackRelease("E2", "16n", time);
      snareSynth.triggerAttackRelease("16n", time);
      break;
    case "hihat":
      hihatSynth.triggerAttackRelease("16n", time, 0.5);
      break;
    case "clap":
      clapSynth.triggerAttackRelease("16n", time);
      break;
    case "tom":
      tomSynth.triggerAttackRelease("A1", "8n", time);
      break;
    case "rimshot":
      rimshotSynth.triggerAttackRelease("32n", time);
      break;
  }
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

    const label = document.createElement("div");
    label.className = "instrument-label";
    label.textContent = inst;
    row.appendChild(label);

    const stepsContainer = document.createElement("div");
    stepsContainer.className = "steps-container";

    padEls[inst] = [];

    for (let s = 0; s < STEPS; s++) {
      // Insert spacer before beats 5, 9, 13
      if (s > 0 && s % 4 === 0) {
        const spacer = document.createElement("div");
        spacer.className = "pad-spacer";
        stepsContainer.appendChild(spacer);
      }

      const pad = document.createElement("div");
      pad.className = "pad";
      if (pattern[inst][s]) pad.classList.add("active");

      pad.addEventListener("click", () => {
        pattern[inst][s] = !pattern[inst][s];
        pad.classList.toggle("active");
        syncToModel();
      });

      stepsContainer.appendChild(pad);
      padEls[inst].push(pad);
    }

    row.appendChild(stepsContainer);
    gridEl.appendChild(row);
  }
}

// --- Playhead & Step Sequencing ---
function stepCallback(time: number, step: number) {
  // Schedule audio triggers
  for (const inst of INSTRUMENTS) {
    if (pattern[inst][step]) {
      triggerInstrument(inst, time);
    }
  }

  // Update UI on the main thread
  Tone.getDraw().schedule(() => {
    // Clear previous step highlight
    if (currentStep >= 0) {
      for (const inst of INSTRUMENTS) {
        padEls[inst][currentStep].classList.remove("current-step");
      }
    }

    currentStep = step;

    // Apply new step highlight + flash
    for (const inst of INSTRUMENTS) {
      const pad = padEls[inst][step];
      pad.classList.add("current-step");

      if (pattern[inst][step]) {
        pad.classList.remove("flash");
        // Force reflow to restart animation
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
  sequenceId = Tone.getTransport().scheduleRepeat((time) => {
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

  // Clear playhead
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
      pattern[inst][s] = false;
      padEls[inst][s].classList.remove("active");
    }
  }
  syncToModel();
}

// --- Load Pattern Data ---
function loadPattern(data: PatternData) {
  if (data.bpm != null) setBPM(data.bpm);
  if (data.swing != null) setSwing(data.swing);
  if (data.pattern) {
    for (const inst of INSTRUMENTS) {
      const steps = data.pattern[inst];
      if (Array.isArray(steps)) {
        for (let s = 0; s < STEPS; s++) {
          pattern[inst][s] = !!steps[s];
          if (padEls[inst][s]) {
            padEls[inst][s].classList.toggle("active", pattern[inst][s]);
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

// --- MCP App SDK ---
const app = new App({ name: "Drum Sequencer", version: "1.0.0" });

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
            pattern[inst][s] = !!steps[s];
            if (padEls[inst][s]) {
              padEls[inst][s].classList.toggle("active", pattern[inst][s]);
            }
          }
        }
      }
    }
  } catch {
    // Partial JSON may be incomplete — ignore parse errors
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

app.connect().then(() => {
  // Host connected — context is handled via ontoolinput/ontoolresult
});
