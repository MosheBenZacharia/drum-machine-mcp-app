// Tone.js is loaded from CDN — declare the global namespace
declare namespace Tone {
  class MembraneSynth {
    constructor(options?: Record<string, unknown>);
    connect(dest: unknown): this;
    triggerAttackRelease(note: string, duration: string, time?: number, velocity?: number): this;
    volume: { value: number };
    dispose(): void;
  }
  class NoiseSynth {
    constructor(options?: Record<string, unknown>);
    connect(dest: unknown): this;
    triggerAttackRelease(duration: string, time?: number, velocity?: number): this;
    volume: { value: number };
    dispose(): void;
  }
  class MetalSynth {
    constructor(options?: Record<string, unknown>);
    connect(dest: unknown): this;
    triggerAttackRelease(duration: string, time?: number, velocity?: number): this;
    volume: { value: number };
    dispose(): void;
  }
  class Volume {
    constructor(volume?: number);
    toDestination(): Volume;
    connect(dest: unknown): this;
    volume: { value: number };
    dispose(): void;
  }
  class Filter {
    constructor(options?: Record<string, unknown>);
    connect(dest: unknown): this;
    dispose(): void;
  }
  function start(): Promise<void>;
  function getTransport(): Transport;
  function getDraw(): Draw;
  function getContext(): { rawContext: unknown };

  interface Transport {
    bpm: { value: number };
    swing: number;
    swingSubdivision: string;
    start(): void;
    stop(): void;
    scheduleRepeat(callback: (time: number) => void, interval: string): number;
    clear(id: number): void;
  }

  interface Draw {
    schedule(callback: () => void, time: number): void;
  }
}
