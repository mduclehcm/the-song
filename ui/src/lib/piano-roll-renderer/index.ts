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
import { midiPlayer } from "@/lib/midi-player";

import * as renderers from "./renderers";
import type { RenderBoundary } from "./types";
import { ScrollController } from "./scroll-controller";
import { getScrollBounds } from "./scroll-utils";
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

  // Double buffering: offscreen canvas for rendering
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

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

  // Handlers
  private scrollController: ScrollController;

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
    this.scrollController = new ScrollController({
      onScrollChange: () => this.scheduleRender(),
      onDragStart: () => this.stopRenderLoop(),
      onSnapStart: () => this.startRenderLoop(),
      onSnapEnd: () => {},
      getScrollBounds: (includeOverscroll) =>
        getScrollBounds(
          this.songInfo,
          this.width,
          this.height,
          includeOverscroll
        ),
    });
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

    // Get context for visible canvas
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    this.ctx = ctx;

    // Create offscreen canvas for double buffering
    this.offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = this.offscreenCanvas.getContext("2d", {
      alpha: false,
    });
    if (!offscreenCtx) {
      throw new Error("Failed to get offscreen canvas context");
    }
    this.offscreenCtx = offscreenCtx;

    // Configure offscreen context for best quality rendering
    offscreenCtx.imageSmoothingEnabled = true;
    offscreenCtx.imageSmoothingQuality = "high";
    if ("textRenderingOptimization" in offscreenCtx) {
      (
        offscreenCtx as unknown as { textRenderingOptimization: string }
      ).textRenderingOptimization = "optimizeQuality";
    }

    // Initial size
    this.updateSize();

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.updateSize();
    });
    this.resizeObserver.observe(container);

    // Setup scroll controller for drag-to-scroll and wheel scroll
    this.scrollController.attach(this.canvas);

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

    // Cleanup scroll controller
    this.scrollController.detach();

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

    // Cleanup offscreen canvas
    this.offscreenCanvas = null;
    this.offscreenCtx = null;

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

    // Update visible canvas
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Scale context for high-DPI displays
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    this.ctx.scale(dpr, dpr);

    // Update offscreen canvas to match
    if (this.offscreenCanvas && this.offscreenCtx) {
      this.offscreenCanvas.width = width * dpr;
      this.offscreenCanvas.height = height * dpr;

      // Scale offscreen context for high-DPI displays
      this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.offscreenCtx.scale(dpr, dpr);

      // Reconfigure offscreen context for best quality rendering
      this.offscreenCtx.imageSmoothingEnabled = true;
      this.offscreenCtx.imageSmoothingQuality = "high";
    }

    this.width = width;
    this.height = height;

    // Render immediately to prevent flash
    // This ensures the canvas is never shown in a cleared state
    this.render();
  }

  private recalculateSongInfo(): void {
    const totalBeats = (this.songConfig.length * this.songConfig.bpm) / 60;
    const beatsPerBar = this.songConfig.timeSignature[0];
    const bars = totalBeats / beatsPerBar;

    this.songInfo.totalBars = bars;
    this.songInfo.beatHeightInPixels = BEAT_SIZE;
    // Bar height must match time-based calculation: beatsPerBar * (beatHeightInPixels + NOTE_SPACING_Y)
    // This ensures bars align with time ruler ticks (e.g., 4 beats = 2 seconds at 120 BPM)
    this.songInfo.barHeightInPixels =
      beatsPerBar * (this.songInfo.beatHeightInPixels + NOTE_SPACING_Y);

    // Calculate total content height
    // Using the actual time-based calculation to match the time ruler rendering
    // pixelsPerSecond = (bpm/60) * (beatHeightInPixels + NOTE_SPACING_Y)
    const pixelsPerSecond =
      (this.songConfig.bpm / 60) * (BEAT_SIZE + NOTE_SPACING_Y);
    const contentHeight = this.songConfig.length * pixelsPerSecond;
    const bottomPadding = PITCH_RULER_HEIGHT; // Add padding at the bottom

    this.songInfo.lengthInPixels = contentHeight + bottomPadding;
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
      const offsetY = PITCH_RULER_HEIGHT + this.scrollController.getScrollY();
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

    const offsetY = PITCH_RULER_HEIGHT + this.scrollController.getScrollY();
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
    const offsetX = TIME_RULER_WIDTH + this.scrollController.getScrollX();
    const offsetY = PITCH_RULER_HEIGHT + this.scrollController.getScrollY();

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

      // Calculate note bounds (note starts at startTime and spans duration beats)
      const noteStartY =
        noteData.startTime *
        (this.songInfo.beatHeightInPixels + NOTE_SPACING_Y);
      const noteHeight =
        this.songInfo.beatHeightInPixels * noteData.duration +
        NOTE_SPACING_Y * Math.max(0, noteData.duration - 1);
      const noteEndY = noteStartY + noteHeight;

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
    const offsetX = TIME_RULER_WIDTH + this.scrollController.getScrollX();
    const offsetY = PITCH_RULER_HEIGHT + this.scrollController.getScrollY();

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
    // Keep running if snap animation is active or playback is running
    if (this.scrollController.isSnapping() || midiPlayer.getIsPlaying()) {
      requestAnimationFrame(() => this.innerLoop());
    } else {
      this.renderLoopRunning = false;
    }
  }

  /**
   * Render a single frame
   * Uses double buffering: renders to offscreen canvas, then copies to visible canvas
   */
  private render(): void {
    if (this.destroyed || !this.ctx || !this.offscreenCtx) return;

    // Update snap-back animation if active
    if (this.scrollController.isSnapping()) {
      this.scrollController.updateSnap();

      // If animation is still running, ensure loop continues
      if (this.scrollController.isSnapping() && !this.renderLoopRunning) {
        this.startRenderLoop();
      }
    }

    // Render to offscreen canvas
    const offscreenCtx = this.offscreenCtx;

    // Clear offscreen canvas
    offscreenCtx.clearRect(0, 0, this.width, this.height);

    // Calculate the render boundary with scroll offsets
    // x and y represent the content offset (scroll position + ruler dimensions)
    const boundary: RenderBoundary = {
      x: TIME_RULER_WIDTH + this.scrollController.getScrollX(),
      y: PITCH_RULER_HEIGHT + this.scrollController.getScrollY(),
      width: this.width,
      height: this.height,
    };

    renderFns.renderBackground(offscreenCtx, boundary, this.songInfo);

    // Get notes for active track directly from crdt for rendering
    const noteIdsByPitch = crdt.getNoteIdsByPitch(this.activeTrackIndex);
    const trackConfig = crdt.getTrackConfig(this.activeTrackIndex);
    const accentColor = trackConfig?.accentColor || "#00ff88"; // fallback color

    renderFns.renderNotes(
      offscreenCtx,
      boundary,
      this.songInfo,
      noteIdsByPitch,
      crdt,
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
          offscreenCtx,
          boundary,
          this.songInfo,
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
        offscreenCtx,
        boundary,
        this.mouseX,
        this.mouseY,
        accentColor
      );
    }

    // Render playhead if playing
    if (midiPlayer.getIsPlaying()) {
      const currentBeat = midiPlayer.getCurrentTimeInBeats();
      renderFns.renderPlayhead(
        offscreenCtx,
        boundary,
        this.songInfo,
        currentBeat,
        accentColor
      );

      // Keep render loop running while playing
      if (!this.renderLoopRunning) {
        this.startRenderLoop();
      }
    }

    renderFns.renderPitchRuler(offscreenCtx, boundary);
    renderFns.renderTimeRuler(
      offscreenCtx,
      boundary,
      this.songConfig,
      this.songInfo
    );

    // Copy offscreen canvas to visible canvas in one operation
    // This is the key to double buffering - all rendering happens offscreen,
    // then we do a single fast blit to the visible canvas
    // We draw using logical pixels (width/height) not physical pixels
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.offscreenCanvas!, 0, 0, this.width, this.height);
  }
}

export const EDITOR_CONTROLLER = PianoRollController.getInstance();
