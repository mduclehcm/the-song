import type { ScrollState, ScrollBounds } from "./types";
import { clampScroll } from "./scroll-utils";
import {
  type SnapAnimationState,
  cancelSnapAnimation,
  createSnapAnimationState,
  startSnapBack,
  updateSnapAnimation,
} from "./snap-animation";

export interface ScrollControllerCallbacks {
  onScrollChange: () => void;
  onDragStart: () => void;
  onSnapStart: () => void;
  onSnapEnd: () => void;
  getScrollBounds: (includeOverscroll: boolean) => ScrollBounds;
}

/**
 * Manages scroll state, input handling, and snap-back animations
 */
export class ScrollController {
  private scrollX: number = 0;
  private scrollY: number = 0;
  private snapState: SnapAnimationState;
  private callbacks: ScrollControllerCallbacks;

  // Drag state
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private wheelScrollTimeout: number | null = null;

  // Canvas reference for event handling
  private canvas: HTMLCanvasElement | null = null;

  constructor(callbacks: ScrollControllerCallbacks) {
    this.callbacks = callbacks;
    this.snapState = createSnapAnimationState(0, 0);
  }

  /**
   * Attach to a canvas element for input handling
   */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  /**
   * Detach from canvas and cleanup event listeners
   */
  detach(): void {
    if (this.wheelScrollTimeout !== null) {
      clearTimeout(this.wheelScrollTimeout);
      this.wheelScrollTimeout = null;
    }

    if (this.canvas) {
      this.canvas.removeEventListener("mousedown", this.handleMouseDown);
      this.canvas.removeEventListener("mousemove", this.handleMouseMove);
      this.canvas.removeEventListener("mouseup", this.handleMouseUp);
      this.canvas.removeEventListener("mouseleave", this.handleMouseUp);
      this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
      this.canvas.removeEventListener("wheel", this.handleWheel);
      this.canvas = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseUp);
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  // ==================== Input Handlers ====================

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      if (this.canvas) {
        this.canvas.style.cursor = "grabbing";
      }
      this.onDragStart();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.onDragMove(deltaX, deltaY);
  };

  private handleMouseUp = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.canvas) {
        this.canvas.style.cursor = "default";
      }
      this.onDragEnd();
    }
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    // Start scroll on first wheel event
    if (this.wheelScrollTimeout === null) {
      this.onDragStart();
    }

    // Clear any existing timeout
    if (this.wheelScrollTimeout !== null) {
      clearTimeout(this.wheelScrollTimeout);
    }

    // Calculate delta with appropriate scaling
    // Note: deltaX and deltaY are positive when scrolling right/down
    // We invert them to match the expected scroll direction
    const deltaX = -e.deltaX;
    const deltaY = -e.deltaY;

    this.onDragMove(deltaX, deltaY);

    // End scroll after a short delay without wheel events
    this.wheelScrollTimeout = window.setTimeout(() => {
      this.wheelScrollTimeout = null;
      this.onDragEnd();
    }, 150);
  };

  // ==================== Scroll Logic ====================

  private onDragStart(): void {
    cancelSnapAnimation(this.snapState);
    this.callbacks.onDragStart();
  }

  private onDragMove(deltaX: number, deltaY: number): void {
    cancelSnapAnimation(this.snapState);

    const bounds = this.callbacks.getScrollBounds(true); // include overscroll
    const clamped = clampScroll(
      {
        scrollX: this.scrollX + deltaX,
        scrollY: this.scrollY + deltaY,
      },
      bounds
    );

    this.scrollX = clamped.scrollX;
    this.scrollY = clamped.scrollY;

    this.callbacks.onScrollChange();
  }

  private onDragEnd(): void {
    const bounds = this.callbacks.getScrollBounds(false); // no overscroll for snap target
    startSnapBack(
      this.snapState,
      { scrollX: this.scrollX, scrollY: this.scrollY },
      bounds
    );

    if (this.snapState.isSnapping) {
      this.callbacks.onSnapStart();
    }
  }

  // ==================== Public API ====================

  /**
   * Get current scroll position
   */
  getScroll(): ScrollState {
    return { scrollX: this.scrollX, scrollY: this.scrollY };
  }

  /**
   * Get scroll X position
   */
  getScrollX(): number {
    return this.scrollX;
  }

  /**
   * Get scroll Y position
   */
  getScrollY(): number {
    return this.scrollY;
  }

  /**
   * Check if snap animation is currently active
   */
  isSnapping(): boolean {
    return this.snapState.isSnapping;
  }

  /**
   * Update snap animation (called each frame during snap)
   * Returns true if animation is still active
   */
  updateSnap(): boolean {
    if (!this.snapState.isSnapping) return false;

    const newScroll = updateSnapAnimation(
      this.snapState,
      { scrollX: this.scrollX, scrollY: this.scrollY },
      performance.now()
    );

    this.scrollX = newScroll.scrollX;
    this.scrollY = newScroll.scrollY;

    // Check if animation just completed
    if (!this.snapState.isSnapping) {
      this.callbacks.onSnapEnd();
    }

    return this.snapState.isSnapping;
  }

  /**
   * Cancel any ongoing snap animation
   */
  cancelSnap(): void {
    cancelSnapAnimation(this.snapState);
  }

  /**
   * Reset scroll to origin
   */
  reset(): void {
    this.scrollX = 0;
    this.scrollY = 0;
    this.cancelSnap();
  }
}
