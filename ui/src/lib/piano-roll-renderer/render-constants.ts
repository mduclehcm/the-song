// ============================================================================
// Layout Constants
// ============================================================================

export const INITIAL_X_PADDING = 10;
export const BLACK_KEY_HEIGHT_RATIO = 0.7;
export const BLACK_KEY_X_OFFSET = 5;
export const KEY_TOP_MARGIN = 20;
export const OCTAVE_LABEL_BOTTOM_OFFSET = 25;

export const SECTION_LABEL_PADDING_TOP = 10;
export const SECTION_LABEL_PADDING_BOTTOM = 10;
export const SECTION_LABEL_X_OFFSET = 20;

export const TIME_RULER_MINOR_TICK_LENGTH = 5;
export const TIME_RULER_MAJOR_TICK_LENGTH = 10;
export const TIME_RULER_LABEL_OFFSET = 15;

export const PLAYHEAD_SHADOW_BLUR = 8;
export const PLAYHEAD_TRIANGLE_WIDTH = 8;
export const PLAYHEAD_TRIANGLE_HEIGHT = 5;

export const NOTE_HOVER_SHADOW_BLUR = 10;
export const NOTE_HOVER_BORDER_WIDTH = 2;

export const PLACEHOLDER_LINE_DASH = [4, 4] as const;
export const PLACEHOLDER_LINE_WIDTH = 2;
export const PLACEHOLDER_ALPHA = 0.5;

// ============================================================================
// Style Constants
// ============================================================================

export const COLORS = {
  // Piano keys
  whiteKey: "#ffffff",
  whiteKeyBorder: "#333333",
  blackKey: "#000000",
  octaveLabel: "#888888",

  // Background
  backgroundOdd: "#141414",
  backgroundEven: "#0c0c0c",

  // Time ruler
  timeRulerBackground: "#0c0c0c",
  timeRulerTick: "#e0e0e0",

  // Placeholder fallback
  placeholderFallback: "rgba(0, 255, 136, 0.5)",
} as const;

export const FONTS = {
  octaveLabel: "14px monospace",
  sectionLabel: "bold 18px sans-serif",
  timeLabel: "11px monospace",
} as const;

export const LINE_WIDTHS = {
  keyBorder: 0.5,
  minorTick: 1,
  majorTick: 2,
  playhead: 2,
} as const;

// ============================================================================
// Section Colors (RGB tuples)
// ============================================================================

export const SECTION_COLORS: Record<string, [number, number, number]> = {
  intro: [100, 149, 237], // CornflowerBlue
  verse: [60, 179, 113], // MediumSeaGreen
  buildup: [255, 165, 0], // Orange
  chorus: [255, 69, 0], // RedOrange
  breakdown: [147, 112, 219], // MediumPurple
  outro: [112, 128, 144], // SlateGray
  default: [128, 128, 128], // Gray
};

// ============================================================================
// Key Layout Data
// ============================================================================

// [exteriorWidthLeft, interiorWidthRight]
// Defines how white keys extend around black keys
export const KEY_WIDTHS: [number, number][] = [
  [0, 1], // C
  [0, 0], // C#
  [1, 1], // D
  [0, 0], // D#
  [1, 0], // E
  [0, 1], // F
  [0, 0], // F#
  [1, 1], // G
  [0, 0], // G#
  [1, 1], // A
  [0, 0], // A#
  [1, 0], // B
];

export const BLACK_KEY_INDICES = [1, 3, 6, 8, 10];
