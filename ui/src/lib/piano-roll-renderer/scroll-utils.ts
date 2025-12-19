import { TIME_RULER_WIDTH, PITCH_RULER_HEIGHT } from "@/config";
import type { TrackInfo, ScrollState, ScrollBounds } from "./types";

export function getScrollBounds(
  trackInfo: TrackInfo,
  viewportWidth: number,
  viewportHeight: number,
  includeOverscroll: boolean = false
): ScrollBounds {
  const contentHeight = trackInfo.lengthInPixels;
  const effectiveViewportHeight = viewportHeight - PITCH_RULER_HEIGHT;
  const minScrollY = Math.min(0, -(contentHeight - effectiveViewportHeight));

  const contentWidth = trackInfo.lengthInPixels;
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
