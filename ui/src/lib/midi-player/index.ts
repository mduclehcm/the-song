import * as Tone from "tone";
import { crdt } from "@/store/slices/synthesized-slice";
import type { NoteData } from "@/lib/piano-roll-renderer/types";

// Starting MIDI note (C2 = 36)
const BASE_MIDI_NOTE = 36;

// Convert pitch index to frequency
function pitchToFrequency(pitch: number): string {
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
}

class MidiPlayer {
  private static instance: MidiPlayer | null = null;

  private synth: Tone.PolySynth | null = null;
  private isPlaying: boolean = false;
  private loopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeCrdt: (() => void) | null = null;
  private unsubscribeBpm: (() => void) | null = null;
  private bpm: number = 120;
  private isStarted: boolean = false;

  private constructor() {}

  static getInstance(): MidiPlayer {
    if (!MidiPlayer.instance) {
      MidiPlayer.instance = new MidiPlayer();
    }
    return MidiPlayer.instance;
  }

  async init(): Promise<void> {
    if (this.isStarted) return;

    await Tone.start();

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 0.3,
      },
    }).toDestination();

    this.synth.volume.value = -6;

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
  }

  async start(): Promise<void> {
    if (!this.isStarted) {
      await this.init();
    }

    if (this.isPlaying) return;

    this.isPlaying = true;
    Tone.getTransport().bpm.value = this.bpm;
    Tone.getTransport().start();

    this.scheduleAllNotes();
  }

  stop(): void {
    this.isPlaying = false;
    this.clearScheduledEvents();

    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }

    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  }

  pause(): void {
    this.isPlaying = false;
    Tone.getTransport().pause();
  }

  resume(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    Tone.getTransport().start();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
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

    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }

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
      });
    });

    // Sort by start time
    notes.sort((a, b) => a.startTime - b.startTime);

    return notes;
  }

  private clearScheduledEvents(): void {
    Tone.getTransport().cancel();
  }

  private scheduleAllNotes(): void {
    if (!this.synth || !this.isPlaying) return;

    this.clearScheduledEvents();

    const notes = this.getAllNotes();

    if (notes.length === 0) {
      this.scheduleLoopCheck(1);
      return;
    }

    let lastNoteEndTime = 0;
    for (const note of notes) {
      const endTime = note.startTime + note.duration;
      if (endTime > lastNoteEndTime) {
        lastNoteEndTime = endTime;
      }
    }

    for (const note of notes) {
      const startSeconds = beatsToSeconds(note.startTime, this.bpm);
      const durationSeconds = beatsToSeconds(note.duration, this.bpm);
      const frequency = pitchToFrequency(note.pitch);
      const velocity = note.velocity / 127;

      Tone.getTransport().schedule((time) => {
        if (this.synth && this.isPlaying) {
          this.synth.triggerAttackRelease(
            frequency,
            durationSeconds,
            time,
            velocity
          );
        }
      }, startSeconds);
    }

    this.scheduleLoopCheck(lastNoteEndTime);
  }

  private scheduleLoopCheck(afterBeats: number): void {
    if (!this.isPlaying) return;

    const delaySeconds = beatsToSeconds(afterBeats, this.bpm);

    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
    }

    // Schedule the loop
    this.loopTimeoutId = setTimeout(() => {
      if (this.isPlaying) {
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

    this.clearScheduledEvents();

    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }

    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    Tone.getTransport().bpm.value = this.bpm;
    Tone.getTransport().start();

    this.scheduleAllNotes();
  }

  async playNote(pitch: number, duration: number = 0.5): Promise<void> {
    if (!this.isStarted) {
      await this.init();
    }

    if (!this.synth) return;

    const frequency = pitchToFrequency(pitch);
    this.synth.triggerAttackRelease(frequency, duration);
  }
}

export const midiPlayer = MidiPlayer.getInstance();
