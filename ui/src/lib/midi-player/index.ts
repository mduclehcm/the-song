import { crdt } from "@/lib/crdt";
import type { NoteData } from "@/lib/piano-roll-renderer/types";
import { SONG_LEN_IN_SECONDS } from "@/config";
import { DrumKit } from "./sound";
import { DrumLoop, VERSE } from "./drum-loop";

let Tone: typeof import("tone") | null = null;

// Starting MIDI note (C2 = 36)
const BASE_MIDI_NOTE = 36;
const NUM_TRACKS = 16;

// Salamander Grand Piano samples from Tone.js examples CDN
const PIANO_SAMPLES_BASE_URL = "https://tonejs.github.io/audio/salamander/";

// Sample mapping for Salamander piano (sparse sampling, Tone.Sampler will interpolate)
const PIANO_SAMPLE_MAP: Record<string, string> = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
};

// Convert pitch index to frequency (requires Tone to be loaded)
function pitchToFrequency(pitch: number): string {
  if (!Tone) throw new Error("Tone.js not loaded");
  const midiNote = BASE_MIDI_NOTE + pitch;
  return Tone.Frequency(midiNote, "midi").toNote();
}

// Convert beats to seconds at a given BPM
function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60;
}

interface ScheduledNote {
  noteId: string;
  pitch: number;
  startTime: number; // in beats
  duration: number; // in beats
  velocity: number;
  trackIndex: number;
}

/**
 * TrackSampler - Manages a Tone.Sampler instance for a single track
 */
class TrackSampler {
  private sampler: InstanceType<typeof import("tone").Sampler> | null = null;
  private synth: InstanceType<typeof import("tone").Synth> | null = null;
  private trackIndex: number;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;
  private isPianoTrack: boolean;

  constructor(trackIndex: number) {
    this.trackIndex = trackIndex;
    // Track 0 is Acoustic Piano
    this.isPianoTrack = trackIndex === 0;
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;
    if (!Tone) throw new Error("Tone.js not loaded");

    const ToneModule = Tone;

    if (this.isPianoTrack) {
      // Load real piano samples for piano track
      this.loadPromise = new Promise<void>((resolve) => {
        this.sampler = new ToneModule.Sampler({
          urls: PIANO_SAMPLE_MAP,
          baseUrl: PIANO_SAMPLES_BASE_URL,
          release: 1,
          onload: () => {
            this.isLoaded = true;
            resolve();
          },
        }).toDestination();

        // Set default volume
        this.sampler.volume.value = -6;
      });
    } else {
      // Use mock synth for other tracks (until we have real samples)
      this.loadPromise = new Promise<void>((resolve) => {
        this.synth = new ToneModule.Synth({
          oscillator: { type: "triangle" },
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 1,
          },
        }).toDestination();

        this.synth.volume.value = -12; // Quieter default for mock synth
        this.isLoaded = true;
        resolve();
      });
    }

    return this.loadPromise;
  }

  triggerAttackRelease(
    note: string,
    duration: number,
    time: number,
    velocity: number
  ): void {
    if (!this.isLoaded) return;

    if (this.isPianoTrack && this.sampler) {
      this.sampler.triggerAttackRelease(note, duration, time, velocity);
    } else if (!this.isPianoTrack && this.synth) {
      this.synth.triggerAttackRelease(note, duration, time, velocity);
    }
  }

  triggerAttack(note: string, time?: number, velocity?: number): void {
    if (!this.isLoaded) return;

    if (this.isPianoTrack && this.sampler) {
      this.sampler.triggerAttack(note, time, velocity);
    } else if (!this.isPianoTrack && this.synth) {
      this.synth.triggerAttack(note, time, velocity);
    }
  }

  triggerRelease(note: string, time?: number): void {
    if (!this.isLoaded) return;

    if (this.isPianoTrack && this.sampler) {
      this.sampler.triggerRelease(note, time);
    } else if (!this.isPianoTrack && this.synth) {
      // Synth only accepts time parameter, not note
      this.synth.triggerRelease(time);
    }
  }

  setVolume(value: number): void {
    if (this.isPianoTrack && this.sampler) {
      this.sampler.volume.value = value;
    } else if (!this.isPianoTrack && this.synth) {
      this.synth.volume.value = value;
    }
  }

  dispose(): void {
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
    }
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    this.isLoaded = false;
    this.loadPromise = null;
  }

  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  getTrackIndex(): number {
    return this.trackIndex;
  }
}

class MidiPlayer {
  private trackSamplers: TrackSampler[] = [];
  private scheduledNoteEventIds: number[] = [];
  private isPlaying: boolean = false;
  private loopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeCrdt: (() => void) | null = null;
  private unsubscribeBpm: (() => void) | null = null;
  private bpm: number = 120;
  private isStarted: boolean = false;
  private isLoading: boolean = false;
  private drumLoop: DrumLoop;

  constructor() {
    // Track samplers will be initialized lazily in init()
    this.drumLoop = new DrumLoop();
  }

  /**
   * Load Tone.js dynamically - must be called before any audio operations
   */
  private async loadTone(): Promise<void> {
    if (Tone) return;
    Tone = await import("tone");
  }

  /**
   * Resume AudioContext after user gesture. Call this on user interaction
   * (e.g., click event) to avoid the "AudioContext was not allowed to start" warning.
   */
  async resumeAudioContext(): Promise<void> {
    await this.loadTone();
    if (Tone!.getContext().state === "suspended") {
      await Tone!.start();
    }
  }

  async init(): Promise<void> {
    if (this.isStarted) return;
    if (this.isLoading) return;

    this.isLoading = true;

    // Load Tone.js dynamically (only happens once)
    await this.loadTone();

    // Resume AudioContext - must be called from a user gesture
    await Tone!.start();

    // Initialize drum loop with Tone instance
    this.drumLoop.setTone(Tone!);

    // Initialize track samplers for all 16 tracks (only if not already initialized)
    if (this.trackSamplers.length === 0) {
      for (let i = 0; i < NUM_TRACKS; i++) {
        this.trackSamplers.push(new TrackSampler(i));
      }
    }

    // Load all track samplers and drum kit in parallel
    await Promise.all([
      ...this.trackSamplers.map((sampler) => sampler.load()),
      this.drumLoop.loadDrumKit(DrumKit),
    ]);

    // Set default pattern (Verse) and ensure drum sequence is ready
    this.drumLoop.setPattern(VERSE);
    this.drumLoop.ensureDrumSequence();

    this.bpm = crdt.getBpmValue();

    this.unsubscribeBpm = crdt.subscribeBpm((bpm) => {
      this.bpm = bpm;
      if (this.isPlaying) {
        this.rescheduleNotes();
      }
    });

    this.unsubscribeCrdt = crdt.subscribeChange(() => {
      if (this.isPlaying) {
        this.rescheduleNotes();
      }
    });

    this.isStarted = true;
    this.isLoading = false;
  }

  async start(): Promise<void> {
    if (!this.isStarted) {
      await this.init();
    }

    if (this.isPlaying) return;
    if (!Tone) return;

    this.isPlaying = true;
    Tone.getTransport().bpm.value = this.bpm;

    // Schedule notes and drums before starting the transport to avoid missing t=0 events
    this.scheduleAllNotes();
    this.drumLoop.start();
    Tone.getTransport().start();
  }

  stop(): void {
    this.isPlaying = false;
    this.clearScheduledEvents();
    this.drumLoop.stop();

    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }

    if (Tone) {
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
    }
  }

  pause(): void {
    this.isPlaying = false;
    this.drumLoop.stop();
    if (Tone) {
      Tone.getTransport().pause();
    }
  }

  resume(): void {
    if (this.isPlaying) return;
    if (!Tone) return;
    this.isPlaying = true;
    this.drumLoop.start();
    Tone.getTransport().start();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the current playback position in beats
   */
  getCurrentTimeInBeats(): number {
    if (!this.isPlaying || !Tone) return 0;
    const seconds = Tone.getTransport().seconds;
    const beatsPerSecond = this.bpm / 60;
    return seconds * beatsPerSecond;
  }

  getTrackSampler(trackIndex: number): TrackSampler | null {
    if (trackIndex < 0 || trackIndex >= NUM_TRACKS) return null;
    return this.trackSamplers[trackIndex];
  }

  getDrumLoop(): DrumLoop {
    return this.drumLoop;
  }

  destroy(): void {
    this.stop();

    if (this.unsubscribeCrdt) {
      this.unsubscribeCrdt();
      this.unsubscribeCrdt = null;
    }

    if (this.unsubscribeBpm) {
      this.unsubscribeBpm();
      this.unsubscribeBpm = null;
    }

    // Dispose all track samplers
    for (const sampler of this.trackSamplers) {
      sampler.dispose();
    }
    this.trackSamplers = [];

    // Reinitialize empty samplers for potential reuse
    for (let i = 0; i < NUM_TRACKS; i++) {
      this.trackSamplers.push(new TrackSampler(i));
    }

    // Dispose drum loop
    this.drumLoop.dispose();

    this.isStarted = false;
  }

  private getAllNotes(): ScheduledNote[] {
    const notes: ScheduledNote[] = [];
    const notesMap = crdt.getNotesMap();

    notesMap.forEach((noteData: NoteData) => {
      notes.push({
        noteId: noteData.id,
        pitch: noteData.pitch,
        startTime: noteData.startTime,
        duration: noteData.duration,
        velocity: noteData.velocity,
        trackIndex: noteData.trackIndex,
      });
    });

    // Sort by start time
    notes.sort((a, b) => a.startTime - b.startTime);

    return notes;
  }

  private clearScheduledEvents(): void {
    if (!Tone) return;
    // IMPORTANT: Don't call Transport.cancel() since it would also cancel
    // other transport-synced events (e.g. our drum Sequence).
    for (const eventId of this.scheduledNoteEventIds) {
      Tone.getTransport().clear(eventId);
    }
    this.scheduledNoteEventIds = [];
  }

  private scheduleAllNotes(): void {
    this.scheduleNotesFromPosition(0);
  }

  private scheduleNotesFromPosition(fromBeats: number): void {
    if (!this.isPlaying) return;
    if (!Tone) return;

    this.clearScheduledEvents();

    const notes = this.getAllNotes();
    const loopDurationBeats = (SONG_LEN_IN_SECONDS * this.bpm) / 60;

    if (notes.length === 0) {
      // If we're past the duration, loop immediately (delay <= 0)
      const remainingBeats = loopDurationBeats - fromBeats;
      this.scheduleLoopCheck(remainingBeats);
      return;
    }

    for (const note of notes) {
      // Only schedule notes that start at or after the current position
      if (note.startTime >= fromBeats) {
        // Calculate relative time from current position
        const relativeStartBeats = note.startTime - fromBeats;
        const startSeconds = beatsToSeconds(relativeStartBeats, this.bpm);
        const durationSeconds = beatsToSeconds(note.duration, this.bpm);
        const frequency = pitchToFrequency(note.pitch);
        const velocity = note.velocity / 127;
        const trackIndex = note.trackIndex;

        const eventId = Tone.getTransport().schedule((time) => {
          if (this.isPlaying) {
            const sampler = this.trackSamplers[trackIndex];
            if (sampler && sampler.getIsLoaded()) {
              sampler.triggerAttackRelease(
                frequency,
                durationSeconds,
                time,
                velocity
              );
            }
          }
        }, startSeconds);
        this.scheduledNoteEventIds.push(eventId);
      }
    }

    // If we're past the song duration, loop back immediately
    if (fromBeats >= loopDurationBeats) {
      // Reset to beginning for the loop
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
      Tone.getTransport().start();
      this.scheduleAllNotes();
    } else {
      // Schedule loop check at the end of the song
      const remainingBeats = loopDurationBeats - fromBeats;
      this.scheduleLoopCheck(remainingBeats);
    }
  }

  private scheduleLoopCheck(afterBeats: number): void {
    if (!this.isPlaying) return;
    if (!Tone) return;

    const delaySeconds = beatsToSeconds(afterBeats, this.bpm);

    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
    }

    // Schedule the loop
    this.loopTimeoutId = setTimeout(() => {
      if (this.isPlaying && Tone) {
        // Reset transport and reschedule
        Tone.getTransport().stop();
        Tone.getTransport().position = 0;
        Tone.getTransport().start();
        this.scheduleAllNotes();
      }
    }, delaySeconds * 1000);
  }

  private rescheduleNotes(): void {
    if (!this.isPlaying) return;
    if (!Tone) return;

    // Save current position before clearing
    const currentTimeInBeats = this.getCurrentTimeInBeats();

    this.clearScheduledEvents();

    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }

    // Update BPM without stopping
    Tone.getTransport().bpm.value = this.bpm;

    // Schedule notes from current position
    this.scheduleNotesFromPosition(currentTimeInBeats);
  }

  async playNote(
    pitch: number,
    duration: number = 0.5,
    trackIndex: number = 0
  ): Promise<void> {
    if (!this.isStarted) {
      await this.init();
    }

    if (!Tone) return;

    const sampler = this.trackSamplers[trackIndex];
    if (!sampler || !sampler.getIsLoaded()) return;

    const frequency = pitchToFrequency(pitch);
    sampler.triggerAttackRelease(frequency, duration, Tone.now(), 0.8);
  }
}

export const midiPlayer = new MidiPlayer();

// Export drum loop utilities for external use
export {
  // Core class
  DrumLoop,
  // Types
  type DrumStep,
  type DrumHit,
  type DrumPattern,
  type DrumInstrument,
  type SongSection,
  // Song section patterns (Lanterns-style Progressive House @ 128 BPM)
  INTRO,
  VERSE,
  BUILDUP,
  CHORUS,
  BREAKDOWN,
  OUTRO,
  // Pattern utilities
  SONG_PATTERNS,
  SONG_STRUCTURE,
  getPatternBySection,
  getPatternById,
  // Legacy exports
  EDM_DRUM_PATTERN_16N,
  EDM_FULL_DRUM_PATTERN_16N,
  HOUSE_DRUM_PATTERN_16N,
  LOFI_DRUM_PATTERN_16N,
} from "./drum-loop";

// Export drum kit utilities
export { DrumKit } from "./sound";
