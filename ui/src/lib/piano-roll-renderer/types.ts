// Note data stored in CRDT - each note has a unique ID for conflict resolution
export interface NoteData {
  id: string; // Unique identifier for CRDT operations
  pitch: number; // MIDI pitch (0-127), determines which column in piano roll
  startTime: number; // in beats
  duration: number; // in beats (endTime = startTime + duration)
  velocity: number; // in velocity (0-127)
  createdAt: number; // timestamp for ordering and conflict resolution
  createdBy: string; // user ID who created this note
}

// Simplified Note for rendering
export interface Note {
  startTime: number; // in beats
  endTime: number; // in beats
  velocity: number; // in velocity (0-127)
}

// Map of noteId -> NoteData
export type NotesMap = Map<string, NoteData>;

// Notes organized by pitch
export type NotesByPitch = Note[][];

// Track configuration without notes
export interface TrackConfig {
  length: number; // in seconds
  timeSignature: [number, number]; // in beats per bar
  bpm: number; // in bpm
}

// Full track with notes for rendering
export interface Track extends TrackConfig {
  notes: NotesByPitch; // level 1 is the pitch, level 2 is the notes
}

export interface TrackInfo {
  totalBars: number;
  lengthInPixels: number;
  beatHeightInPixels: number;
  barHeightInPixels: number;
}

export interface ScrollState {
  scrollX: number;
  scrollY: number;
}

export interface ScrollBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
