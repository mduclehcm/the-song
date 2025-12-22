import {
  TIME_RULER_WIDTH,
  PITCH_RULER_HEIGHT,
  TOTAL_PITCHES,
  BEAT_SIZE,
  NOTE_SPACING_X,
} from "@/config";
import type { SongInfo, ScrollState, ScrollBounds } from "./types";

export function getScrollBounds(
  songInfo: SongInfo,
  viewportWidth: number,
  viewportHeight: number,
  includeOverscroll: boolean = false
): ScrollBounds {
  const contentHeight = songInfo.lengthInPixels;
  const effectiveViewportHeight = viewportHeight - PITCH_RULER_HEIGHT;
  const minScrollY = Math.min(0, -(contentHeight - effectiveViewportHeight));

  // Calculate actual content width based on number of pitches
  // Each pitch takes up (BEAT_SIZE + NOTE_SPACING_X * 2) pixels, plus initial offset
  const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;
  const initialOffset = 10 + NOTE_SPACING_X * 2;
  const contentWidth = initialOffset + TOTAL_PITCHES * cellWidth;
  const effectiveViewportWidth = viewportWidth - TIME_RULER_WIDTH;
  const minScrollX = Math.min(0, -(contentWidth - effectiveViewportWidth));

  const overscrollAmountY = includeOverscroll
    ? effectiveViewportHeight * 0.15
    : 0;
  const overscrollAmountX = includeOverscroll
    ? effectiveViewportWidth * 0.15
    : 0;

  return {
    minX: minScrollX - overscrollAmountX,
    maxX: overscrollAmountX,
    minY: minScrollY - overscrollAmountY,
    maxY: overscrollAmountY,
  };
}

export function clampScroll(
  scroll: ScrollState,
  bounds: ScrollBounds
): ScrollState {
  return {
    scrollX: Math.max(bounds.minX, Math.min(bounds.maxX, scroll.scrollX)),
    scrollY: Math.max(bounds.minY, Math.min(bounds.maxY, scroll.scrollY)),
  };
}
