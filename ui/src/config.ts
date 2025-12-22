export const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export const WS_URL = import.meta.env.VITE_WS_URL;
export const WS_CONNECT_DELAY = 250;

export const THROTTLE_COMMIT_DELAY = 100;

// Total number of pitches (5 octaves * 12 notes per octave)
export const TOTAL_PITCHES = 60;

export const MIN_BPM = 90;
export const MAX_BPM = 250;

export const SONG_LEN_IN_SECONDS = 300;

export const TIME_RULER_WIDTH = 40;
export const BEAT_SIZE = 25;
export const BEAT_HALF_SIZE = BEAT_SIZE / 2;

export const PITCH_RULER_HEIGHT = 120;
export const PITCH_RULER_OCTAVES = 6;
export const PITCH_RULER_NOTES_PER_OCTAVE = 12;

export const NOTE_SPACING_X = 5;
export const NOTE_SPACING_Y = 5;
