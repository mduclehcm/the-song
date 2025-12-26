import type { ScrollState, ScrollBounds } from "./types";

export interface SnapAnimationState {
  isSnapping: boolean;
  snapStartX: number;
  snapStartY: number;
  snapTargetX: number;
  snapTargetY: number;
  snapProgress: number;
  snapStartTime: number;
}

export function createSnapAnimationState(
  snapTargetX: number,
  snapTargetY: number
): SnapAnimationState {
  return {
    isSnapping: false,
    snapStartX: 0,
    snapStartY: 0,
    snapTargetX,
    snapTargetY,
    snapProgress: 0,
    snapStartTime: 0,
  };
}

export function startSnapBack(
  state: SnapAnimationState,
  scroll: ScrollState,
  bounds: ScrollBounds
): void {
  // Calculate target positions (clamp to valid bounds)
  state.snapTargetX = Math.max(
    bounds.minX,
    Math.min(bounds.maxX, scroll.scrollX)
  );
  state.snapTargetY = Math.max(
    bounds.minY,
    Math.min(bounds.maxY, scroll.scrollY)
  );

  // Only start animation if we're out of bounds
  if (
    scroll.scrollX !== state.snapTargetX ||
    scroll.scrollY !== state.snapTargetY
  ) {
    state.isSnapping = true;
    state.snapStartX = scroll.scrollX;
    state.snapStartY = scroll.scrollY;
    state.snapProgress = 0;
    state.snapStartTime = performance.now();
  }
}

export function updateSnapAnimation(
  state: SnapAnimationState,
  scroll: ScrollState,
  currentTime: number,
  duration: number = 300
): ScrollState {
  if (!state.isSnapping) return scroll;

  const elapsed = currentTime - state.snapStartTime;
  state.snapProgress = Math.min(1, elapsed / duration);

  // Ease-out cubic easing for smooth snap-back
  const eased = 1 - Math.pow(1 - state.snapProgress, 3);

  // Interpolate scroll positions
  const newScrollX =
    state.snapStartX + (state.snapTargetX - state.snapStartX) * eased;
  const newScrollY =
    state.snapStartY + (state.snapTargetY - state.snapStartY) * eased;

  // End animation when complete
  if (state.snapProgress >= 1) {
    state.isSnapping = false;
    return {
      scrollX: state.snapTargetX,
      scrollY: state.snapTargetY,
    };
  }

  return {
    scrollX: newScrollX,
    scrollY: newScrollY,
  };
}

export function cancelSnapAnimation(state: SnapAnimationState): void {
  state.isSnapping = false;
}
