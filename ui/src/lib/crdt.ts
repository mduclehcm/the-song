import { LoroCounter, LoroDoc, LoroList, LoroMap } from "loro-crdt";

import { MIN_BPM, MAX_BPM } from "@/config";
import { EventEmitter } from "@/lib/event";
import type {
  NoteData,
  NotesMap,
  NoteIdsByPitch,
} from "@/lib/piano-roll-renderer/types";

// Total number of pitches (4 octaves * 12 notes per octave)
const TOTAL_PITCHES = 48;
const NUM_TRACKS = 16;

// Default accent colors for tracks (16 distinct colors)
export const DEFAULT_ACCENT_COLORS = [
  "#00ff88", // Mint green
  "#ff6b6b", // Coral red
  "#4ecdc4", // Turquoise
  "#ffe66d", // Yellow
  "#a8dadc", // Light blue
  "#ff69b4", // Hot pink
  "#98d8c8", // Seafoam
  "#f7b731", // Orange
  "#a29bfe", // Lavender
  "#fd79a8", // Pink
  "#74b9ff", // Sky blue
  "#55efc4", // Aqua
  "#fdcb6e", // Gold
  "#e17055", // Terra cotta
  "#81ecec", // Cyan
  "#a29bfe", // Purple
];

export interface TrackConfig {
  accentColor: string;
  // Future attributes can be added here
}

// Type for note updates (excludes immutable fields)
export type NoteUpdates = Partial<
  Omit<NoteData, "id" | "createdAt" | "createdBy" | "trackIndex">
>;

export type CommitEvent = {
  name: "commit";
  data: Uint8Array;
};
export type CrdtEvent = CommitEvent;

export type ChangeCallback = () => void;
export type BpmChangeCallback = (bpm: number) => void;

export class Crdt extends EventEmitter<CommitEvent> {
  private doc: LoroDoc;
  private bpm: LoroCounter;
  private notes: LoroMap; // Map of noteId -> NoteData
  private tracks: LoroList; // List of 16 tracks, each track is a LoroList of pitch lists
  private trackConfigs: LoroList; // List of 16 track configs
  private changeCallbacks: ChangeCallback[] = [];
  private bpmChangeCallbacks: BpmChangeCallback[] = [];

  constructor() {
    super();
    this.doc = new LoroDoc();
    this.bpm = this.doc.getCounter("bpm");
    this.notes = this.doc.getMap("notes");
    this.tracks = this.doc.getList("tracks");
    this.trackConfigs = this.doc.getList("trackConfigs");

    // Subscribe to notes changes
    this.notes.subscribe(() => {
      this.notifyChange();
    });

    // Subscribe to tracks changes
    this.tracks.subscribe(() => {
      this.notifyChange();
    });

    // Subscribe to track configs changes
    this.trackConfigs.subscribe(() => {
      this.notifyChange();
    });

    // Subscribe to BPM changes
    this.bpm.subscribe(() => {
      this.notifyBpmChange();
    });

    this.doc.subscribeLocalUpdates((updates) => {
      this.emit({ name: "commit", data: updates });
    });
  }

  public import(snapshot: Uint8Array) {
    this.doc.import(snapshot);
  }

  // --- Direct access to Loro containers ---

  public getNotesContainer(): LoroMap {
    return this.notes;
  }

  public getTracksContainer(): LoroList {
    return this.tracks;
  }

  public getTrackContainer(trackIndex: number): LoroList | null {
    if (trackIndex < 0 || trackIndex >= NUM_TRACKS) return null;
    return this.tracks.get(trackIndex) as LoroList | null;
  }

  public getPitchListContainer(
    trackIndex: number,
    pitch: number
  ): LoroList | null {
    const track = this.getTrackContainer(trackIndex);
    if (!track || pitch < 0 || pitch >= TOTAL_PITCHES) return null;
    return track.get(pitch) as LoroList | null;
  }

  // --- Track Config Operations ---

  public getTrackConfig(trackIndex: number): TrackConfig | null {
    if (trackIndex < 0 || trackIndex >= NUM_TRACKS) return null;

    const configMap = this.trackConfigs.get(trackIndex) as LoroMap | undefined;
    if (!configMap) return null;

    return {
      accentColor:
        (configMap.get("accentColor") as string) ||
        DEFAULT_ACCENT_COLORS[trackIndex],
    };
  }

  public setTrackConfig(
    trackIndex: number,
    config: Partial<TrackConfig>
  ): void {
    if (trackIndex < 0 || trackIndex >= NUM_TRACKS) return;

    const configMap = this.trackConfigs.get(trackIndex) as LoroMap | undefined;
    if (!configMap) return;

    if (config.accentColor !== undefined) {
      configMap.set("accentColor", config.accentColor);
    }

    this.commit();
  }

  public getAllTrackConfigs(): TrackConfig[] {
    const configs: TrackConfig[] = [];
    for (let i = 0; i < NUM_TRACKS; i++) {
      const config = this.getTrackConfig(i);
      configs.push(config || { accentColor: DEFAULT_ACCENT_COLORS[i] });
    }
    return configs;
  }

  // --- End Track Config Operations ---

  // --- BPM Operations ---

  public getBpm() {
    return this.bpm;
  }

  public getBpmValue(): number {
    return this.bpm.value;
  }

  public subscribeBpm(callback: BpmChangeCallback): () => void {
    this.bpmChangeCallbacks.push(callback);
    return () => {
      const index = this.bpmChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.bpmChangeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyBpmChange(): void {
    const bpmValue = this.bpm.value;
    for (const callback of this.bpmChangeCallbacks) {
      callback(bpmValue);
    }
  }

  public incrementBpm(value: number) {
    if (value < 0) {
      throw new Error("Value must be positive");
    }
    if (value > 10) {
      throw new Error("Value must be less than 10");
    }
    if (this.bpm.value + value > MAX_BPM) {
      value = MAX_BPM - this.bpm.value;
    }
    this.bpm.increment(value);
    this.commit();
  }

  public decrementBpm(value: number) {
    if (value < 0) {
      throw new Error("Value must be positive");
    }
    if (value > 10) {
      throw new Error("Value must be less than 10");
    }
    if (this.bpm.value - value < MIN_BPM) {
      value = MIN_BPM - this.bpm.value;
    }
    this.bpm.decrement(value);
    this.commit();
  }

  // --- Notes CRDT Operations ---

  /**
   * Generate a unique ID for a new note
   * Format: {userId}:{timestamp}:{random}
   */
  public generateNoteId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId}:${timestamp}:${random}`;
  }

  /**
   * Add a new note to the CRDT store
   */
  public addNote(noteData: NoteData): void {
    // Add to notes map
    const noteMap = this.notes.setContainer(noteData.id, new LoroMap());
    noteMap.set("id", noteData.id);
    noteMap.set("pitch", noteData.pitch);
    noteMap.set("startTime", noteData.startTime);
    noteMap.set("duration", noteData.duration);
    noteMap.set("velocity", noteData.velocity);
    noteMap.set("createdAt", noteData.createdAt);
    noteMap.set("createdBy", noteData.createdBy);
    noteMap.set("trackIndex", noteData.trackIndex);

    // Add note ID to the track's pitch list
    const pitchList = this.getPitchListContainer(
      noteData.trackIndex,
      noteData.pitch
    );
    if (pitchList) {
      pitchList.push(noteData.id);
    }

    this.commit();
  }

  /**
   * Update an existing note's properties
   * Only updates the provided fields, preserves others
   */
  public updateNote(
    noteId: string,
    updates: Partial<
      Omit<NoteData, "id" | "createdAt" | "createdBy" | "trackIndex">
    >
  ): void {
    const noteMap = this.notes.get(noteId) as LoroMap | undefined;
    if (!noteMap) {
      console.warn(`Note with id ${noteId} not found`);
      return;
    }

    const oldPitch = noteMap.get("pitch") as number;
    const trackIndex = noteMap.get("trackIndex") as number;

    // Handle pitch change - need to move note ID to different pitch list
    if (updates.pitch !== undefined && updates.pitch !== oldPitch) {
      // Remove from old pitch list
      const oldPitchList = this.getPitchListContainer(trackIndex, oldPitch);
      if (oldPitchList) {
        const noteIds = oldPitchList.toArray() as string[];
        const idx = noteIds.indexOf(noteId);
        if (idx !== -1) {
          oldPitchList.delete(idx, 1);
        }
      }
      // Add to new pitch list
      const newPitchList = this.getPitchListContainer(
        trackIndex,
        updates.pitch
      );
      if (newPitchList) {
        newPitchList.push(noteId);
      }
      noteMap.set("pitch", updates.pitch);
    }

    if (updates.startTime !== undefined) {
      noteMap.set("startTime", updates.startTime);
    }
    if (updates.duration !== undefined) {
      noteMap.set("duration", updates.duration);
    }
    if (updates.velocity !== undefined) {
      noteMap.set("velocity", updates.velocity);
    }
    this.commit();
  }

  /**
   * Delete a note from the CRDT store
   */
  public deleteNote(noteId: string): void {
    const noteMap = this.notes.get(noteId) as LoroMap | undefined;
    if (noteMap) {
      const pitch = noteMap.get("pitch") as number;
      const trackIndex = noteMap.get("trackIndex") as number;

      // Remove from pitch list
      const pitchList = this.getPitchListContainer(trackIndex, pitch);
      if (pitchList) {
        const noteIds = pitchList.toArray() as string[];
        const idx = noteIds.indexOf(noteId);
        if (idx !== -1) {
          pitchList.delete(idx, 1);
        }
      }
    }

    this.notes.delete(noteId);
    this.commit();
  }

  /**
   * Get a single note by ID
   */
  public getNote(noteId: string): NoteData | null {
    const noteMap = this.notes.get(noteId) as LoroMap | undefined;
    if (!noteMap) return null;

    return {
      id: noteMap.get("id") as string,
      pitch: noteMap.get("pitch") as number,
      startTime: noteMap.get("startTime") as number,
      duration: noteMap.get("duration") as number,
      velocity: noteMap.get("velocity") as number,
      createdAt: noteMap.get("createdAt") as number,
      createdBy: noteMap.get("createdBy") as string,
      trackIndex: noteMap.get("trackIndex") as number,
    };
  }

  /**
   * Get all notes as a Map
   */
  public getNotesMap(): NotesMap {
    const result = new Map<string, NoteData>();
    const entries = this.notes.entries();

    for (const [key, value] of entries) {
      const noteMap = value as LoroMap;
      const noteData: NoteData = {
        id: noteMap.get("id") as string,
        pitch: noteMap.get("pitch") as number,
        startTime: noteMap.get("startTime") as number,
        duration: noteMap.get("duration") as number,
        velocity: noteMap.get("velocity") as number,
        createdAt: noteMap.get("createdAt") as number,
        createdBy: noteMap.get("createdBy") as string,
        trackIndex: noteMap.get("trackIndex") as number,
      };
      result.set(key, noteData);
    }

    return result;
  }

  /**
   * Get note IDs organized by pitch for a specific track
   */
  public getNoteIdsByPitch(trackIndex: number): NoteIdsByPitch {
    const result: NoteIdsByPitch = Array.from(
      { length: TOTAL_PITCHES },
      () => []
    );
    const track = this.getTrackContainer(trackIndex);
    if (!track) return result;

    for (let pitch = 0; pitch < TOTAL_PITCHES; pitch++) {
      const pitchList = track.get(pitch) as LoroList | undefined;
      if (pitchList) {
        result[pitch] = pitchList.toArray() as string[];
      }
    }

    return result;
  }

  /**
   * Get notes for a specific track, organized by pitch for rendering
   */
  public getNotesForTrackByPitch(trackIndex: number): NoteIdsByPitch {
    return this.getNoteIdsByPitch(trackIndex);
  }

  /**
   * Subscribe to any change (notes or tracks)
   */
  public subscribeChange(callback: ChangeCallback): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyChange(): void {
    for (const callback of this.changeCallbacks) {
      callback();
    }
  }

  // --- End Notes CRDT Operations ---

  private commit() {
    this.doc.commit();
  }
}

// Singleton CRDT instance - exported here to avoid circular dependencies
export const crdt = new Crdt();
