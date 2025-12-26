import type { Players, Sequence } from "tone";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Available drum instruments
 */
export type DrumInstrument =
  | "kick"
  | "snare"
  | "clap"
  | "hihat"
  | "openhat"
  | "rim"
  | "perc"
  | "crash";

/**
 * Single drum hit with velocity and probability
 */
export interface DrumHit {
  /** Velocity from 0-1 (default: 0.8) */
  velocity?: number;
  /** Probability of playing 0-1 (default: 1.0) */
  probability?: number;
}

/**
 * A single step in a drum pattern
 */
export type DrumStep =
  | {
      [K in DrumInstrument]?: DrumHit | boolean;
    }
  | null;

/**
 * Song section type
 */
export type SongSection =
  | "intro"
  | "verse"
  | "buildup"
  | "chorus"
  | "breakdown"
  | "outro"
  | "lofi";

/**
 * Song structure segment with timing
 */
export interface SongStructureSegment {
  section: SongSection;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

/**
 * Fixed song structure (100s total)
 */
export const SONG_STRUCTURE: SongStructureSegment[] = [
  { section: "intro", startTime: -10, endTime: 16 },
  { section: "verse", startTime: 16, endTime: 32 },
  { section: "buildup", startTime: 32, endTime: 48 },
  { section: "chorus", startTime: 48, endTime: 64 },
  { section: "breakdown", startTime: 64, endTime: 80 },
  { section: "outro", startTime: 80, endTime: 120 },
];

/**
 * A drum pattern with metadata
 */
export interface DrumPattern {
  id: string;
  name: string;
  section: SongSection;
  steps: DrumStep[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Normal hit */
const h = (v: number = 0.8): DrumHit => ({ velocity: v });

/** Ghost note (soft) */
const g = (v: number = 0.3): DrumHit => ({ velocity: v });

/** Accent (loud) */
const a = (): DrumHit => ({ velocity: 1 });

/** Maybe hit (probability) */
const m = (v: number = 0.6, p: number = 0.5): DrumHit => ({
  velocity: v,
  probability: p,
});

/**
 * Normalize DrumHit - converts boolean to DrumHit object
 */
const normalizeHit = (
  hit: DrumHit | boolean | undefined
): DrumHit | undefined => {
  if (hit === undefined || hit === false) return undefined;
  if (hit === true) return { velocity: 0.8, probability: 1 };
  return hit;
};

// ============================================================================
// LANTERNS-STYLE PROGRESSIVE HOUSE PATTERNS (128 BPM, 4/4)
// ============================================================================

/**
 * INTRO - Minimal, atmospheric
 * Sparse kick with subtle hi-hats, building anticipation
 */
export const INTRO: DrumPattern = {
  id: "intro",
  name: "Intro",
  section: "intro",
  steps: [
    // Beat 1
    { kick: h(0.6) },
    null,
    { hihat: g(0.2) },
    null,
    // Beat 2
    null,
    null,
    { hihat: g(0.2) },
    null,
    // Beat 3
    { kick: h(0.5) },
    null,
    { hihat: g(0.2) },
    null,
    // Beat 4
    null,
    null,
    { hihat: g(0.2) },
    { hihat: m(0.15, 0.3) },
  ],
};

/**
 * VERSE - Light groove with steady four-on-the-floor
 * Classic house pattern with closed hi-hats
 */
export const VERSE: DrumPattern = {
  id: "verse",
  name: "Verse",
  section: "verse",
  steps: [
    // Beat 1
    { kick: h(0.7), hihat: h(0.5) },
    { hihat: g(0.25) },
    { hihat: h(0.4) },
    { hihat: g(0.25) },
    // Beat 2
    { kick: h(0.7), clap: h(0.5), hihat: h(0.5) },
    { hihat: g(0.25) },
    { hihat: h(0.4) },
    { hihat: g(0.25) },
    // Beat 3
    { kick: h(0.7), hihat: h(0.5) },
    { hihat: g(0.25) },
    { hihat: h(0.4) },
    { hihat: g(0.25), openhat: m(0.3, 0.2) },
    // Beat 4
    { kick: h(0.7), clap: h(0.5), hihat: h(0.5) },
    { hihat: g(0.25) },
    { hihat: h(0.4) },
    { hihat: g(0.25) },
  ],
};

/**
 * BUILDUP - Increasing energy
 * Snare rolls building tension before the drop
 */
export const BUILDUP: DrumPattern = {
  id: "buildup",
  name: "Build-Up",
  section: "buildup",
  steps: [
    // Beat 1
    { kick: h(0.8), hihat: h(0.6) },
    { hihat: h(0.4), snare: g(0.2) },
    { hihat: h(0.5), snare: g(0.25) },
    { hihat: h(0.4), snare: g(0.3) },
    // Beat 2
    { kick: h(0.8), snare: h(0.5), hihat: h(0.6) },
    { hihat: h(0.4), snare: g(0.35) },
    { hihat: h(0.5), snare: h(0.4) },
    { hihat: h(0.4), snare: h(0.45) },
    // Beat 3
    { kick: h(0.8), snare: h(0.5), hihat: h(0.6) },
    { hihat: h(0.4), snare: h(0.5) },
    { hihat: h(0.5), snare: h(0.55) },
    { hihat: h(0.4), snare: h(0.6) },
    // Beat 4
    { kick: h(0.9), snare: h(0.7), hihat: h(0.6) },
    { snare: h(0.75) },
    { snare: h(0.8) },
    { snare: a(), crash: h(0.3) },
  ],
};

/**
 * CHORUS (DROP) - Full energy
 * Complete four-on-the-floor with layered claps and driving hi-hats
 */
export const CHORUS: DrumPattern = {
  id: "chorus",
  name: "Chorus / Drop",
  section: "chorus",
  steps: [
    // Beat 1
    { kick: a(), hihat: h(0.7), crash: h(0.4) },
    { hihat: g(0.35) },
    { hihat: h(0.55) },
    { hihat: g(0.35), openhat: m(0.4, 0.25) },
    // Beat 2
    { kick: h(0.9), clap: a(), snare: h(0.6), hihat: h(0.7) },
    { hihat: g(0.35) },
    { kick: m(0.6, 0.4), hihat: h(0.55) },
    { hihat: g(0.35) },
    // Beat 3
    { kick: h(0.9), hihat: h(0.7) },
    { hihat: g(0.35) },
    { hihat: h(0.55) },
    { hihat: g(0.35), openhat: m(0.4, 0.25) },
    // Beat 4
    { kick: h(0.9), clap: a(), snare: h(0.6), hihat: h(0.7) },
    { hihat: g(0.35) },
    { kick: m(0.6, 0.4), hihat: h(0.55) },
    { kick: m(0.5, 0.3), hihat: g(0.35) },
  ],
};

/**
 * BREAKDOWN - Stripped back, emotional
 * Minimal drums, focus on melody
 */
export const BREAKDOWN: DrumPattern = {
  id: "breakdown",
  name: "Breakdown",
  section: "breakdown",
  steps: [
    // Beat 1
    { kick: h(0.5) },
    null,
    { hihat: g(0.15) },
    null,
    // Beat 2
    { clap: h(0.4) },
    null,
    { hihat: g(0.15) },
    null,
    // Beat 3
    null,
    null,
    { hihat: g(0.15) },
    null,
    // Beat 4
    { clap: h(0.35) },
    null,
    { hihat: g(0.15) },
    { rim: m(0.3, 0.3) },
  ],
};

/**
 * LOFI CHILL - Relaxed, atmospheric
 * Boom-bap style with swing feel elements
 */
export const LOFI_CHILL: DrumPattern = {
  id: "lofi_chill",
  name: "Chill Lofi",
  section: "lofi",
  steps: [
    // Beat 1
    { kick: h(0.8), hihat: h(0.5) },
    { hihat: g(0.3) },
    { hihat: g(0.4), perc: m(0.4, 0.3) },
    { hihat: g(0.3) },
    // Beat 2
    { snare: h(0.7), hihat: h(0.5) },
    { kick: m(0.5, 0.4), hihat: g(0.3) },
    { hihat: g(0.4) },
    { hihat: g(0.3), openhat: m(0.4, 0.2) },
    // Beat 3
    { kick: h(0.7), hihat: h(0.5) },
    { hihat: g(0.3) },
    { kick: m(0.6, 0.6), hihat: g(0.4) },
    { hihat: g(0.3) },
    // Beat 4
    { snare: h(0.7), hihat: h(0.5) },
    { hihat: g(0.3), crash: m(0.5, 0.1) },
    { kick: h(0.6), hihat: g(0.4) },
    { hihat: g(0.3), rim: m(0.4, 0.4) },
  ],
};

/**
 * OUTRO - Fading out
 * Gradually removing elements
 */
export const OUTRO: DrumPattern = {
  id: "outro",
  name: "Outro",
  section: "outro",
  steps: [
    // Beat 1
    { kick: h(0.5), hihat: g(0.3) },
    { hihat: g(0.15) },
    { hihat: g(0.25) },
    { hihat: g(0.15) },
    // Beat 2
    { kick: h(0.45), clap: h(0.35), hihat: g(0.3) },
    { hihat: g(0.15) },
    { hihat: g(0.2) },
    { hihat: g(0.1) },
    // Beat 3
    { kick: h(0.4), hihat: g(0.25) },
    null,
    { hihat: g(0.2) },
    null,
    // Beat 4
    { clap: h(0.3), hihat: g(0.2) },
    null,
    { hihat: g(0.15) },
    null,
  ],
};

// ============================================================================
// PATTERN COLLECTION
// ============================================================================

/**
 * All patterns for the song in order
 */
export const SONG_PATTERNS: DrumPattern[] = [
  INTRO,
  VERSE,
  BUILDUP,
  CHORUS,
  BREAKDOWN,
  LOFI_CHILL,
  OUTRO,
];

/**
 * Get pattern by section
 */
export function getPatternBySection(section: SongSection): DrumPattern {
  const pattern = SONG_PATTERNS.find((p) => p.section === section);
  return pattern || VERSE;
}

/**
 * Get pattern by id
 */
export function getPatternById(id: string): DrumPattern | undefined {
  return SONG_PATTERNS.find((p) => p.id === id);
}

// Legacy exports for backward compatibility
export const EDM_DRUM_PATTERN_16N: DrumStep[] = CHORUS.steps;
export const EDM_FULL_DRUM_PATTERN_16N: DrumStep[] = CHORUS.steps;
export const HOUSE_DRUM_PATTERN_16N: DrumStep[] = VERSE.steps;
export const LOFI_DRUM_PATTERN_16N: DrumStep[] = LOFI_CHILL.steps;

// ============================================================================
// DRUM LOOP CLASS
// ============================================================================

/**
 * Drum Loop Manager for Lanterns-style Progressive House
 * 128 BPM, 4/4 time signature
 */
export class DrumLoop {
  private drumPlayers: Players | null = null;
  private drumSequence: Sequence<DrumStep> | null = null;
  private drumIsLoaded: boolean = false;
  private drumLoadPromise: Promise<void> | null = null;
  private drumLoopActive: boolean = false;
  private isPlaying: boolean = false;
  private Tone: typeof import("tone") | null = null;

  // Current pattern
  private currentPattern: DrumPattern = VERSE;

  // Pattern chain for song structure
  private patternChain: DrumPattern[] = [];
  private chainIndex: number = 0;
  private barsPerPattern: number = 8;
  private barCounter: number = 0;
  private stepCounter: number = 0;

  // Callbacks
  private onPatternChange?: (pattern: DrumPattern) => void;
  private onBarChange?: (bar: number) => void;

  constructor(toneInstance: typeof import("tone") | null = null) {
    this.Tone = toneInstance;
  }

  setTone(toneInstance: typeof import("tone")): void {
    this.Tone = toneInstance;
  }

  async loadDrumKit(drumSamples: Record<string, string>): Promise<void> {
    if (this.drumIsLoaded) return;
    if (this.drumLoadPromise) return this.drumLoadPromise;
    if (!this.Tone) throw new Error("Tone.js not initialized");

    const ToneModule = this.Tone;
    this.drumLoadPromise = new Promise<void>((resolve) => {
      this.drumPlayers = new ToneModule.Players({
        urls: drumSamples,
        onload: () => {
          this.drumIsLoaded = true;
          resolve();
        },
        onerror: (err) => {
          console.error("Failed to load drum samples", err);
          resolve();
        },
      }).toDestination();

      this.drumPlayers.volume.value = -6;
    });

    return this.drumLoadPromise;
  }

  // ----- PATTERN MANAGEMENT -----

  setPattern(pattern: DrumPattern): void {
    this.currentPattern = pattern;
    this.rebuildSequence();
    this.onPatternChange?.(pattern);
  }

  setPatternBySection(section: SongSection): void {
    this.setPattern(getPatternBySection(section));
  }

  getPattern(): DrumPattern {
    return this.currentPattern;
  }

  /**
   * Set up song structure with pattern chain
   * Example: setupSongStructure([INTRO, VERSE, BUILDUP, CHORUS, BREAKDOWN, CHORUS, OUTRO], 8)
   */
  setupSongStructure(
    patterns: DrumPattern[],
    barsPerPattern: number = 8
  ): void {
    this.patternChain = patterns;
    this.barsPerPattern = barsPerPattern;
    this.chainIndex = 0;
    this.barCounter = 0;
    if (patterns.length > 0) {
      this.setPattern(patterns[0]);
    }
  }

  /**
   * Setup default Lanterns-style song structure
   */
  setupDefaultStructure(): void {
    this.setupSongStructure(
      [INTRO, VERSE, BUILDUP, CHORUS, BREAKDOWN, BUILDUP, CHORUS, OUTRO],
      8
    );
  }

  clearPatternChain(): void {
    this.patternChain = [];
    this.chainIndex = 0;
    this.barCounter = 0;
  }

  // ----- SEQUENCE MANAGEMENT -----

  private rebuildSequence(): void {
    if (this.drumSequence) {
      this.drumSequence.dispose();
      this.drumSequence = null;
    }
    this.ensureDrumSequence();
  }

  ensureDrumSequence(): void {
    if (this.drumSequence) return;
    if (!this.drumPlayers) return;
    if (!this.Tone) return;

    const steps = this.currentPattern.steps;

    this.drumSequence = new this.Tone.Sequence<DrumStep>(
      (time, step) => {
        if (!this.isPlaying) return;
        if (!this.drumPlayers) return;
        if (!step) return;

        this.triggerStep(step, time);

        // Track bars (16 steps = 1 bar in 16n subdivision)
        this.stepCounter++;
        if (this.stepCounter >= 16) {
          this.stepCounter = 0;
          this.barCounter++;
          this.onBarChange?.(this.barCounter);

          // Check for pattern chain advancement
          if (
            this.patternChain.length > 0 &&
            this.barCounter >= this.barsPerPattern
          ) {
            this.advancePatternChain();
          }
        }
      },
      steps,
      "16n"
    );

    this.drumSequence.loop = true;
    this.drumSequence.loopStart = 0;
    this.drumSequence.loopEnd = steps.length;
  }

  private advancePatternChain(): void {
    this.chainIndex = (this.chainIndex + 1) % this.patternChain.length;
    this.barCounter = 0;
    this.setPattern(this.patternChain[this.chainIndex]);
  }

  private triggerStep(step: DrumStep, time: number): void {
    if (!this.drumPlayers || !step) return;

    const instruments: DrumInstrument[] = [
      "kick",
      "snare",
      "clap",
      "hihat",
      "openhat",
      "rim",
      "perc",
      "crash",
    ];

    for (const inst of instruments) {
      const hitConfig = normalizeHit(step[inst]);
      if (!hitConfig) continue;
      if (!this.drumPlayers.has(inst)) continue;

      // Check probability
      const probability = hitConfig.probability ?? 1;
      if (Math.random() > probability) continue;

      const velocity = hitConfig.velocity ?? 0.8;

      // Trigger the sample
      const player = this.drumPlayers.player(inst);
      player.volume.value = this.velocityToDb(velocity);
      player.start(time);
    }
  }

  private velocityToDb(velocity: number): number {
    return -24 + velocity * 24;
  }

  // ----- PLAYBACK CONTROL -----

  start(): void {
    if (this.drumLoopActive) return;
    if (!this.drumSequence) return;

    this.isPlaying = true;
    this.barCounter = 0;
    this.stepCounter = 0;
    this.drumSequence.start(0);
    this.drumLoopActive = true;
  }

  stop(): void {
    if (!this.drumLoopActive) return;
    if (!this.drumSequence) return;
    if (!this.Tone) return;

    this.isPlaying = false;
    this.drumSequence.stop(this.Tone.getTransport().seconds);
    this.drumPlayers?.stopAll();
    this.drumLoopActive = false;
    this.barCounter = 0;
    this.stepCounter = 0;
  }

  setVolume(value: number): void {
    if (this.drumPlayers) {
      this.drumPlayers.volume.value = value;
    }
  }

  // ----- STATE GETTERS -----

  getIsLoaded(): boolean {
    return this.drumIsLoaded;
  }

  getIsActive(): boolean {
    return this.drumLoopActive;
  }

  getBarCounter(): number {
    return this.barCounter;
  }

  getCurrentSection(): SongSection {
    return this.currentPattern.section;
  }

  getAvailablePatterns(): DrumPattern[] {
    return SONG_PATTERNS;
  }

  // ----- CALLBACKS -----

  onPatternChanged(callback: (pattern: DrumPattern) => void): void {
    this.onPatternChange = callback;
  }

  onBarChanged(callback: (bar: number) => void): void {
    this.onBarChange = callback;
  }

  // ----- CLEANUP -----

  dispose(): void {
    this.stop();
    if (this.drumSequence) {
      this.drumSequence.dispose();
      this.drumSequence = null;
    }
    if (this.drumPlayers) {
      this.drumPlayers.dispose();
      this.drumPlayers = null;
    }
    this.drumIsLoaded = false;
    this.drumLoadPromise = null;
    this.drumLoopActive = false;
    this.isPlaying = false;
    this.patternChain = [];
  }
}
