import { LoroCounter, LoroDoc, LoroMap } from "loro-crdt";

import { THROTTLE_COMMIT_DELAY, MIN_BPM, MAX_BPM } from "@/config";
import { EventEmitter } from "@/lib/event";
import { throttle } from "@/lib/utils";
import type {
  NoteData,
  NotesMap,
  NotesByPitch,
} from "@/lib/piano-roll-renderer/types";

// Total number of pitches (4 octaves * 12 notes per octave)
const TOTAL_PITCHES = 48;

export type CommitEvent = {
  name: "commit";
  data: Uint8Array;
};
export type CrdtEvent = CommitEvent;

export type NotesChangeCallback = (notes: NotesMap) => void;

export class Crdt extends EventEmitter<CommitEvent> {
  private doc: LoroDoc;
  private bpm: LoroCounter;
  private notes: LoroMap;
  private notesChangeCallbacks: NotesChangeCallback[] = [];

  constructor() {
    super();
    this.doc = new LoroDoc();
    this.bpm = this.doc.getCounter("bpm");
    this.notes = this.doc.getMap("notes");
    this.commitThrottled = throttle(
      this.commitThrottled.bind(this),
      THROTTLE_COMMIT_DELAY
    );

    // Subscribe to notes changes
    this.notes.subscribe(() => {
      this.notifyNotesChange();
    });
  }

  public import(snapshot: Uint8Array) {
    this.doc.import(snapshot);
  }

  public getBpm() {
    return this.bpm;
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
    const noteMap = this.notes.setContainer(noteData.id, new LoroMap());
    noteMap.set("id", noteData.id);
    noteMap.set("pitch", noteData.pitch);
    noteMap.set("startTime", noteData.startTime);
    noteMap.set("duration", noteData.duration);
    noteMap.set("velocity", noteData.velocity);
    noteMap.set("createdAt", noteData.createdAt);
    noteMap.set("createdBy", noteData.createdBy);
    this.commit();
  }

  /**
   * Update an existing note's properties
   * Only updates the provided fields, preserves others
   */
  public updateNote(
    noteId: string,
    updates: Partial<Omit<NoteData, "id" | "createdAt" | "createdBy">>
  ): void {
    const noteMap = this.notes.get(noteId) as LoroMap | undefined;
    if (!noteMap) {
      console.warn(`Note with id ${noteId} not found`);
      return;
    }

    if (updates.pitch !== undefined) {
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
    this.notes.delete(noteId);
    this.commit();
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
      };
      result.set(key, noteData);
    }

    return result;
  }

  /**
   * Get notes organized by pitch for rendering
   * Returns an array where index = pitch, value = array of notes at that pitch
   */
  public getNotesByPitch(): NotesByPitch {
    const result: NotesByPitch = Array.from(
      { length: TOTAL_PITCHES },
      () => []
    );
    const notesMap = this.getNotesMap();

    for (const noteData of notesMap.values()) {
      if (noteData.pitch >= 0 && noteData.pitch < TOTAL_PITCHES) {
        result[noteData.pitch].push({
          startTime: noteData.startTime,
          // duration 1 means note occupies only the start beat (endTime = startTime)
          endTime: noteData.startTime + noteData.duration - 1,
          velocity: noteData.velocity,
        });
      }
    }

    // Sort notes by startTime within each pitch
    for (const pitchNotes of result) {
      pitchNotes.sort((a, b) => a.startTime - b.startTime);
    }

    return result;
  }

  /**
   * Subscribe to notes changes
   */
  public subscribeNotes(callback: NotesChangeCallback): () => void {
    this.notesChangeCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.notesChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.notesChangeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyNotesChange(): void {
    const notesMap = this.getNotesMap();
    for (const callback of this.notesChangeCallbacks) {
      callback(notesMap);
    }
  }

  // --- End Notes CRDT Operations ---

  private commit() {
    this.doc.commit();
    this.commitThrottled();
  }

  private commitThrottled() {
    this.emit({ name: "commit", data: this.doc.export({ mode: "update" }) });
  }
}
