import { BEAT_SIZE, NOTE_SPACING_X, NOTE_SPACING_Y } from "@/config";
import {
  BLACK_KEY_INDICES,
  COLORS,
  INITIAL_X_PADDING,
  SECTION_COLORS,
} from "./render-constants";

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Get accent fill style with alpha transparency
 */
export function getAccentFillStyle(accentColor: string, alpha: number): string {
  const rgb = hexToRgb(accentColor);
  if (rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }
  return COLORS.placeholderFallback;
}

/**
 * Calculate the initial X position for content area
 * @param boundaryX - The x offset from the boundary (includes scroll offset)
 */
export function calculateInitialX(boundaryX: number): number {
  return boundaryX + INITIAL_X_PADDING + NOTE_SPACING_X * 2;
}

/**
 * Calculate cell dimensions for the grid
 */
export function calculateCellDimensions(): { width: number; height: number } {
  return {
    width: BEAT_SIZE + NOTE_SPACING_X * 2,
    height: BEAT_SIZE + NOTE_SPACING_Y,
  };
}

/**
 * Get section color with alpha transparency
 */
export function getSectionColor(section: string, alpha: number): string {
  const rgb = SECTION_COLORS[section] ?? SECTION_COLORS.default;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * Check if a pitch corresponds to a black key
 */
export function isBlackKey(pitch: number): boolean {
  return BLACK_KEY_INDICES.includes(pitch % 12);
}
