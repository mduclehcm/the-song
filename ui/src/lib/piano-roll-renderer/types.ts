// Note data stored in CRDT - each note has a unique ID for conflict resolution
export interface NoteData {
  id: string; // Unique identifier for CRDT operations
  pitch: number; // MIDI pitch (0-127), determines which column in piano roll
  startTime: number; // in beats
  duration: number; // in beats (endTime = startTime + duration)
  velocity: number; // in velocity (0-127)
  createdAt: number; // timestamp for ordering and conflict resolution
  createdBy: string; // user ID who created this note
  trackIndex: number; // which track this note belongs to (0-15)
}

// Simplified Note for rendering
export interface Note {
  startTime: number; // in beats
  endTime: number; // in beats
  velocity: number; // in velocity (0-127)
}

// Map of noteId -> NoteData
export type NotesMap = Map<string, NoteData>;

// Note IDs organized by pitch for a track
export type NoteIdsByPitch = string[][];

// Notes organized by pitch for rendering
export type NotesByPitch = Note[][];

// Number of tracks in a song (fixed at 16)
export const TOTAL_TRACKS = 16;

// Track contains note IDs organized by pitch
export interface Track {
  index: number; // 0-15
  noteIdsByPitch: NoteIdsByPitch; // level 1 is the pitch, level 2 is the note IDs
}

// Song configuration without tracks/notes
export interface SongConfig {
  length: number; // in seconds
  timeSignature: [number, number]; // in beats per bar
  bpm: number; // in bpm
}

// Full song with tracks for rendering
export interface Song extends SongConfig {
  tracks: Track[]; // 16 tracks
}

export interface SongInfo {
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
