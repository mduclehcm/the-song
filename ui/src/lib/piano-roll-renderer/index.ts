import {
  BEAT_SIZE,
  NOTE_SPACING_X,
  NOTE_SPACING_Y,
  PITCH_RULER_HEIGHT,
  SONG_LEN_IN_SECONDS,
  TIME_RULER_WIDTH,
} from "@/config";
import { getUserId } from "@/store/store";
import { crdt } from "@/store/slices/synthesized-slice";

import { DragHandler } from "./drag-handler";
import * as renderers from "./renderers";
import { clampScroll, getScrollBounds } from "./scroll-utils";
import {
  type SnapAnimationState,
  cancelSnapAnimation,
  createSnapAnimationState,
  startSnapBack,
  updateSnapAnimation,
} from "./snap-animation";
import type { NoteData, SongConfig, SongInfo } from "./types";

// HMR support: store renderer functions in a mutable object
let renderFns = { ...renderers };
if (import.meta.hot) {
  import.meta.hot.accept("./renderers", (newModule) => {
    if (newModule) {
      renderFns = newModule as unknown as typeof renderers;
    }
  });
}

export type {
  Note,
  NoteData,
  NotesByPitch,
  NoteIdsByPitch,
  NotesMap,
  Song,
  SongConfig,
  SongInfo,
  Track,
} from "./types";

/**
 * Immediate mode UI for the piano roll
 */
class PianoRollController {
  private static instance: PianoRollController | null = null;

  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 0;
  private height: number = 0;
  private destroyed: boolean = true;
  private songConfig: SongConfig;
  private songInfo: SongInfo;
  private activeTrackIndex: number = 0; // Currently active track for editing

  // Subscriptions
  private unsubscribeCrdt: (() => void) | null = null;
  private unsubscribeBpm: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Scroll state
  private scrollX: number = 0;
  private scrollY: number = 0;

  // Handlers
  private dragHandler: DragHandler | null = null;
  private snapState: SnapAnimationState;

  // Mouse position state
  private mouseX: number | null = null;
  private mouseY: number | null = null;

  // Hovered note (pitch and startTime to identify it in render, id for deletion)
  private hoveredNoteId: string | null = null;

  // Note creation drag state
  private isCreatingNote: boolean = false;
  private noteCreationPitch: number | null = null;
  private noteCreationStartBeat: number | null = null;
  private noteCreationEndBeat: number | null = null;

  // Resize handle state
  private hoveredResizeHandle: "start" | "end" | null = null;
  private isResizingNote: boolean = false;
  private resizingNoteId: string | null = null;
  private resizingHandle: "start" | "end" | null = null;
  private resizingNoteOriginalStartTime: number | null = null;
  private resizingNoteOriginalDuration: number | null = null;

  // Render scheduling state
  private renderScheduled: boolean = false;
  private renderLoopRunning: boolean = false;

  private constructor() {
    // Initialize with default values
    this.songConfig = {
      length: SONG_LEN_IN_SECONDS,
      timeSignature: [4, 4],
      bpm: 120,
    };
    this.songInfo = {
      lengthInPixels: 0,
      totalBars: 0,
      beatHeightInPixels: 0,
      barHeightInPixels: 0,
    };
    this.snapState = createSnapAnimationState();
  }

  static getInstance(): PianoRollController {
    if (!PianoRollController.instance) {
      PianoRollController.instance = new PianoRollController();
    }
    return PianoRollController.instance;
  }

  /**
   * Get the active track index
   */
  getActiveTrackIndex(): number {
    return this.activeTrackIndex;
  }

  /**
   * Set the active track index
   */
  setActiveTrackIndex(index: number): void {
    if (index >= 0 && index < 16) {
      this.activeTrackIndex = index;
      this.scheduleRender();
    }
  }

  /**
   * Mount the renderer to a container element
   * Creates a canvas and starts the render loop
   */
  mount(container: HTMLElement): void {
    // If already mounted to this container, do nothing
    if (this.container === container && !this.destroyed) {
      return;
    }

    // Unmount from previous container if any
    this.unmount();

    this.container = container;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    container.appendChild(this.canvas);

    // Get context
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    this.ctx = ctx;

    // Configure context for best quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if ("textRenderingOptimization" in ctx) {
      (
        ctx as unknown as { textRenderingOptimization: string }
      ).textRenderingOptimization = "optimizeQuality";
    }

    // Initial size
    this.updateSize();

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.updateSize();
    });
    this.resizeObserver.observe(container);

    // Setup drag-to-scroll handler
    this.dragHandler = new DragHandler(this.canvas, {
      onDragStart: () => {
        cancelSnapAnimation(this.snapState);
        this.stopRenderLoop();
      },
      onDragMove: (deltaX, deltaY) => {
        cancelSnapAnimation(this.snapState);
        const bounds = getScrollBounds(
          this.songInfo,
          this.width,
          this.height,
          true
        );
        const clamped = clampScroll(
          {
            scrollX: this.scrollX + deltaX,
            scrollY: this.scrollY + deltaY,
          },
          bounds
        );
        this.scrollX = clamped.scrollX;
        this.scrollY = clamped.scrollY;
        this.scheduleRender();
      },
      onDragEnd: () => {
        const bounds = getScrollBounds(
          this.songInfo,
          this.width,
          this.height,
          false
        );
        startSnapBack(
          this.snapState,
          { scrollX: this.scrollX, scrollY: this.scrollY },
          bounds
        );
        // Start continuous rendering for snap animation
        this.startRenderLoop();
      },
    });

    // Setup mouse handlers
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);

    // Subscribe to CRDT changes - schedule render on any change
    this.unsubscribeCrdt = crdt.subscribeChange(() => {
      this.scheduleRender();
    });

    // Subscribe to CRDT BPM changes
    this.unsubscribeBpm = crdt.subscribeBpm((bpm) => {
      this.songConfig = { ...this.songConfig, bpm };
      this.recalculateSongInfo();
      this.scheduleRender();
    });

    // Initial load
    this.songConfig = {
      ...this.songConfig,
      bpm: crdt.getBpmValue() || 120,
    };
    this.recalculateSongInfo();

    // Mark as active and schedule initial render
    this.destroyed = false;
    this.scheduleRender();
  }

  /**
   * Unmount the renderer from its container
   */
  unmount(): void {
    this.destroyed = true;
    this.renderLoopRunning = false;

    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener("mousemove", this.handleMouseMove);
      this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
      this.canvas.removeEventListener("mousedown", this.handleMouseDown);
      this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    }

    // Cleanup drag handler
    if (this.dragHandler) {
      this.dragHandler.destroy();
      this.dragHandler = null;
    }

    // Cleanup resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Unsubscribe from CRDT
    if (this.unsubscribeCrdt) {
      this.unsubscribeCrdt();
      this.unsubscribeCrdt = null;
    }

    // Unsubscribe from store
    if (this.unsubscribeBpm) {
      this.unsubscribeBpm();
      this.unsubscribeBpm = null;
    }

    // Remove canvas from container
    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }

    this.canvas = null;
    this.ctx = null;
    this.container = null;
  }

  /**
   * Schedule a render on the next animation frame
   * Only schedules if not already scheduled to avoid redundant renders
   */
  private scheduleRender(): void {
    if (this.renderScheduled || this.destroyed) return;

    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      if (!this.destroyed) {
        this.render();
      }
    });
  }

  private updateSize(): void {
    if (!this.container || !this.canvas || !this.ctx) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Set canvas resolution for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Scale context for high-DPI displays
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    this.ctx.scale(dpr, dpr);

    // Configure context for best quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    this.width = width;
    this.height = height;

    // Schedule a render after size change
    this.scheduleRender();
  }

  private recalculateSongInfo(): void {
    const totalBeats = (this.songConfig.length * this.songConfig.bpm) / 60;
    const beatsPerBar = this.songConfig.timeSignature[0];
    const bars = totalBeats / beatsPerBar;
    this.songInfo.lengthInPixels = bars * TIME_RULER_WIDTH;
    this.songInfo.totalBars = bars;
    this.songInfo.beatHeightInPixels = BEAT_SIZE;
    this.songInfo.barHeightInPixels =
      this.songInfo.beatHeightInPixels * beatsPerBar;
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;

    if (this.isResizingNote) {
      // Handle resize drag
      this.handleResizeDrag();
      this.updateCursor();
      this.scheduleRender();
    } else {
      this.updateHoveredNote();
      this.updateCursor();
      this.scheduleRender();
    }

    // Update note creation end beat during drag
    if (this.isCreatingNote && this.mouseY !== null) {
      const offsetY = PITCH_RULER_HEIGHT + this.scrollY;
      const cellHeight = BEAT_SIZE + NOTE_SPACING_Y;
      const relativeY = this.mouseY - offsetY;
      this.noteCreationEndBeat = Math.round(relativeY / cellHeight);
      this.scheduleRender();
    }
  };

  private handleMouseLeave = () => {
    this.mouseX = null;
    this.mouseY = null;
    this.hoveredNoteId = null;
    this.hoveredResizeHandle = null;

    // Cancel note creation if leaving canvas mid-drag
    this.isCreatingNote = false;
    this.noteCreationPitch = null;
    this.noteCreationStartBeat = null;
    this.noteCreationEndBeat = null;

    // Cancel resize if leaving canvas mid-drag
    if (this.isResizingNote) {
      this.isResizingNote = false;
      this.resizingNoteId = null;
      this.resizingHandle = null;
      this.resizingNoteOriginalStartTime = null;
      this.resizingNoteOriginalDuration = null;
    }

    this.updateCursor();
    this.scheduleRender();
  };

  private handleResizeDrag(): void {
    if (
      !this.resizingNoteId ||
      this.mouseY === null ||
      this.resizingHandle === null ||
      this.resizingNoteOriginalStartTime === null ||
      this.resizingNoteOriginalDuration === null
    ) {
      return;
    }

    const offsetY = PITCH_RULER_HEIGHT + this.scrollY;
    const cellHeight = BEAT_SIZE + NOTE_SPACING_Y;
    const relativeY = this.mouseY - offsetY;
    const targetBeat = Math.round(relativeY / cellHeight);

    const noteData = crdt.getNote(this.resizingNoteId);
    if (!noteData) return;

    // Handle edge case: if original duration was 1, allow resizing in either direction
    const wasSingleBeat = this.resizingNoteOriginalDuration === 1;

    if (this.resizingHandle === "start") {
      // Resizing from start: update startTime and adjust duration
      const newStartTime = Math.max(0, targetBeat);
      const endTime =
        this.resizingNoteOriginalStartTime +
        this.resizingNoteOriginalDuration -
        1;
      const newDuration = Math.max(1, endTime - newStartTime + 1);

      crdt.updateNote(this.resizingNoteId, {
        startTime: newStartTime,
        duration: newDuration,
      });
    } else if (this.resizingHandle === "end") {
      if (wasSingleBeat) {
        // For single beat notes resizing from "end" handle,
        // allow resizing in either direction based on mouse position

        if (targetBeat < this.resizingNoteOriginalStartTime) {
          // Resizing backwards (upward): move startTime and keep duration 1
          const newStartTime = Math.max(0, targetBeat);
          crdt.updateNote(this.resizingNoteId, {
            startTime: newStartTime,
            duration: 1,
          });
        } else if (targetBeat > this.resizingNoteOriginalStartTime) {
          // Resizing forwards (downward): keep startTime, increase duration
          const newDuration = Math.max(
            1,
            targetBeat - this.resizingNoteOriginalStartTime + 1
          );
          crdt.updateNote(this.resizingNoteId, {
            duration: newDuration,
          });
        }
      } else {
        // Normal resize from end: update duration only
        const newEndTime = Math.max(
          this.resizingNoteOriginalStartTime,
          targetBeat
        );
        const newDuration = Math.max(
          1,
          newEndTime - this.resizingNoteOriginalStartTime + 1
        );

        crdt.updateNote(this.resizingNoteId, {
          duration: newDuration,
        });
      }
    }
  }

  private updateCursor(): void {
    if (!this.canvas) return;

    if (this.isResizingNote) {
      this.canvas.style.cursor = "ns-resize";
    } else if (this.hoveredResizeHandle !== null) {
      this.canvas.style.cursor = "ns-resize";
    } else if (this.hoveredNoteId !== null) {
      this.canvas.style.cursor = "pointer";
    } else {
      this.canvas.style.cursor = "default";
    }
  }

  private updateHoveredNote(): void {
    this.hoveredNoteId = null;
    this.hoveredResizeHandle = null;

    if (this.mouseX === null || this.mouseY === null) return;

    // Only check if mouse is in content area
    if (this.mouseX < TIME_RULER_WIDTH || this.mouseY < PITCH_RULER_HEIGHT) {
      return;
    }

    // Calculate offsets
    const offsetX = TIME_RULER_WIDTH + this.scrollX;
    const offsetY = PITCH_RULER_HEIGHT + this.scrollY;

    // Calculate the grid cell size
    const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;

    // Convert mouse position to relative position
    const initialX = offsetX + 10 + NOTE_SPACING_X * 2;
    const relativeX = this.mouseX - initialX;
    const relativeY = this.mouseY - offsetY;

    // Get pitch index (column)
    const pitchIndex = Math.round(relativeX / cellWidth);
    if (pitchIndex < 0) return;

    // Get notes for active track directly from crdt
    const noteIdsByPitch = crdt.getNoteIdsByPitch(this.activeTrackIndex);
    const handleHitRadius = BEAT_SIZE / 3; // Radius for detecting handle hover

    // Check notes at this pitch
    const noteIds = noteIdsByPitch[pitchIndex] || [];
    for (const noteId of noteIds) {
      const noteData = crdt.getNote(noteId);
      if (!noteData) continue;

      // Calculate note bounds (endTime is inclusive: startTime + duration - 1)
      const noteStartY =
        noteData.startTime *
          (this.songInfo.beatHeightInPixels + NOTE_SPACING_Y) -
        BEAT_SIZE / 2;
      const noteEndY =
        (noteData.startTime + noteData.duration - 1) *
          (this.songInfo.beatHeightInPixels + NOTE_SPACING_Y) +
        BEAT_SIZE / 2;

      // Check if mouse is within the note vertical bounds
      if (
        relativeY >= noteStartY - BEAT_SIZE / 3 &&
        relativeY <= noteEndY + BEAT_SIZE / 3
      ) {
        // Found the hovered note
        this.hoveredNoteId = noteId;

        // Check if mouse is near the start or end handle
        const distanceToStart = Math.abs(relativeY - noteStartY);
        const distanceToEnd = Math.abs(relativeY - noteEndY);

        if (distanceToStart < handleHitRadius) {
          this.hoveredResizeHandle = "start";
        } else if (distanceToEnd < handleHitRadius) {
          this.hoveredResizeHandle = "end";
        }

        return;
      }
    }
  }

  private handleMouseDown = (event: MouseEvent) => {
    if (!this.canvas) return;

    // Only handle left-click
    if (event.button !== 0) return;

    // If clicking on a resize handle, start resizing
    if (this.hoveredResizeHandle !== null && this.hoveredNoteId !== null) {
      const noteData = crdt.getNote(this.hoveredNoteId);
      if (noteData) {
        this.isResizingNote = true;
        this.resizingNoteId = this.hoveredNoteId;
        this.resizingHandle = this.hoveredResizeHandle;
        this.resizingNoteOriginalStartTime = noteData.startTime;
        this.resizingNoteOriginalDuration = noteData.duration;
        this.canvas.style.cursor = "ns-resize";
        return;
      }
    }

    // If clicking on an existing note (not on resize handle), delete it
    if (this.hoveredNoteId !== null) {
      crdt.deleteNote(this.hoveredNoteId);
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Only handle clicks in the content area (not over rulers)
    if (mouseX < TIME_RULER_WIDTH || mouseY < PITCH_RULER_HEIGHT) {
      return;
    }

    // Calculate offsets
    const offsetX = TIME_RULER_WIDTH + this.scrollX;
    const offsetY = PITCH_RULER_HEIGHT + this.scrollY;

    // Calculate the grid cell size
    const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;
    const cellHeight = BEAT_SIZE + NOTE_SPACING_Y;

    // Convert mouse position to grid position
    const initialX = offsetX + 10 + NOTE_SPACING_X * 2;
    const relativeX = mouseX - initialX;
    const relativeY = mouseY - offsetY;

    // Snap to nearest grid position
    const pitchIndex = Math.round(relativeX / cellWidth);
    const beatIndex = Math.round(relativeY / cellHeight);

    if (pitchIndex >= 0 && beatIndex >= 0) {
      // Start note creation
      this.isCreatingNote = true;
      this.noteCreationPitch = pitchIndex;
      this.noteCreationStartBeat = beatIndex;
      this.noteCreationEndBeat = beatIndex;
    }
  };

  private handleMouseUp = (event: MouseEvent) => {
    // only handle left-click
    if (event.button !== 0) return;

    // Handle resize end
    if (this.isResizingNote) {
      this.isResizingNote = false;
      this.resizingNoteId = null;
      this.resizingHandle = null;
      this.resizingNoteOriginalStartTime = null;
      this.resizingNoteOriginalDuration = null;
      this.updateCursor();
      this.scheduleRender();
      return;
    }

    if (!this.isCreatingNote) return;

    const pitch = this.noteCreationPitch;
    const startBeat = this.noteCreationStartBeat;
    const endBeat = this.noteCreationEndBeat;

    // reset note creation state
    this.isCreatingNote = false;
    this.noteCreationPitch = null;
    this.noteCreationStartBeat = null;
    this.noteCreationEndBeat = null;

    if (pitch === null || startBeat === null || endBeat === null) return;

    // calculate duration (minimum 1 beat)
    const minBeat = Math.min(startBeat, endBeat);
    const maxBeat = Math.max(startBeat, endBeat);
    const duration = Math.max(1, maxBeat - minBeat + 1);

    const userId = getUserId()!;
    const noteData: NoteData = {
      id: crdt.generateNoteId(userId),
      pitch,
      startTime: minBeat,
      duration,
      velocity: 100,
      createdAt: Date.now(),
      createdBy: userId,
      trackIndex: this.activeTrackIndex,
    };

    crdt.addNote(noteData);
  };

  /**
   * Start the continuous render loop for animations
   * Only runs when snap animations are active
   */
  private startRenderLoop(): void {
    if (this.renderLoopRunning || this.destroyed) return;
    this.renderLoopRunning = true;
    this.innerLoop();
  }

  /**
   * Stop the continuous render loop
   */
  private stopRenderLoop(): void {
    this.renderLoopRunning = false;
  }

  /**
   * Continuous render loop for animations
   * Checks if animation is still running and stops if not needed
   */
  private innerLoop(): void {
    if (!this.renderLoopRunning || this.destroyed || !this.ctx) return;

    // Render the frame
    this.render();

    // Check if we need to continue the loop
    // Keep running if snap animation is active
    if (this.snapState.isSnapping) {
      requestAnimationFrame(() => this.innerLoop());
    } else {
      this.renderLoopRunning = false;
    }
  }

  /**
   * Render a single frame
   */
  private render(): void {
    if (this.destroyed || !this.ctx) return;

    // Update snap-back animation if active
    if (this.snapState.isSnapping) {
      const newScroll = updateSnapAnimation(
        this.snapState,
        { scrollX: this.scrollX, scrollY: this.scrollY },
        performance.now()
      );
      this.scrollX = newScroll.scrollX;
      this.scrollY = newScroll.scrollY;

      // If animation is still running, ensure loop continues
      if (this.snapState.isSnapping && !this.renderLoopRunning) {
        this.startRenderLoop();
      }
    }

    const ctx = this.ctx;
    // clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Calculate offsets for the main drawing area
    const offsetX = TIME_RULER_WIDTH + this.scrollX;
    const offsetY = PITCH_RULER_HEIGHT + this.scrollY;

    renderFns.renderBackground(
      ctx,
      this.songInfo,
      this.width,
      this.height,
      offsetX,
      offsetY
    );

    // Get notes for active track directly from crdt for rendering
    const noteIdsByPitch = crdt.getNoteIdsByPitch(this.activeTrackIndex);
    const trackConfig = crdt.getTrackConfig(this.activeTrackIndex);
    const accentColor = trackConfig?.accentColor || "#00ff88"; // fallback color

    renderFns.renderNotes(
      ctx,
      this.songConfig,
      this.songInfo,
      noteIdsByPitch,
      crdt,
      offsetX,
      offsetY,
      this.hoveredNoteId,
      accentColor
    );

    // Render note creation preview during drag
    if (this.isCreatingNote) {
      if (
        this.noteCreationPitch !== null &&
        this.noteCreationStartBeat !== null &&
        this.noteCreationEndBeat !== null
      ) {
        renderFns.renderNoteCreationPreview(
          ctx,
          this.songInfo,
          offsetX,
          offsetY,
          this.noteCreationPitch,
          this.noteCreationStartBeat,
          this.noteCreationEndBeat,
          accentColor
        );
      } else {
        console.error("Note creation state is invalid");
      }
    }

    // Render mouse placeholder if not creating note and not hovering over a note
    if (
      this.mouseX !== null &&
      this.mouseY !== null &&
      !this.isCreatingNote &&
      !this.hoveredNoteId
    ) {
      renderFns.renderMousePlaceholder(
        ctx,
        this.mouseX,
        this.mouseY,
        offsetX,
        offsetY,
        accentColor
      );
    }

    renderFns.renderPitchRuler(ctx, offsetX);
    renderFns.renderTimeRuler(
      ctx,
      this.songConfig,
      this.songInfo,
      this.height,
      offsetY
    );
  }
}

export const EDITOR_CONTROLLER = PianoRollController.getInstance();
