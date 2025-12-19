import {
  BEAT_SIZE,
  NOTE_SPACING_X,
  NOTE_SPACING_Y,
  PITCH_RULER_HEIGHT,
  TIME_RULER_WIDTH,
} from "@/config";
import type { Crdt } from "@/lib/crdt";
import { getUserId } from "@/store/store";

import { DragHandler } from "./drag-handler";
import {
  renderBackground,
  renderMousePlaceholder,
  renderNoteCreationPreview,
  renderNoteGrid,
  renderNotes,
  renderPitchRuler,
  renderTimeRuler,
} from "./renderers";
import { clampScroll, getScrollBounds } from "./scroll-utils";
import {
  type SnapAnimationState,
  cancelSnapAnimation,
  createSnapAnimationState,
  startSnapBack,
  updateSnapAnimation,
} from "./snap-animation";
import type { NoteData, Track, TrackConfig, TrackInfo } from "./types";

// Re-export types for external use
export type {
  Note,
  NoteData,
  NotesByPitch,
  NotesMap,
  Track,
  TrackConfig,
  TrackInfo,
} from "./types";

/**
 * Piano roll renderer
 * - Renders a piano roll
 * - Time ruler in vertical axis
 * - Pitch ruler in horizontal axis
 * - Notes are rendered as rounded rectangles. 1 beat note will be rendered as a circle.
 *
 * @param canvas - The canvas element to render on
 */
export default class PianoRollRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private destroyed: boolean = false;
  private track: Track;
  private trackConfig: TrackConfig;
  private trackInfo: TrackInfo;

  // CRDT subscription
  private crdt: Crdt | null = null;
  private unsubscribeCrdt: (() => void) | null = null;

  // Scroll state
  private scrollX: number = 0;
  private scrollY: number = 0;

  // Handlers
  private dragHandler: DragHandler;
  private snapState: SnapAnimationState;

  // Mouse position state
  private mouseX: number | null = null;
  private mouseY: number | null = null;

  // Hovered note (pitch and startTime to identify it in render, id for deletion)
  private hoveredNoteId: string | null = null;
  private hoveredNotePitch: number | null = null;
  private hoveredNoteStartTime: number | null = null;

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

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Configure context for best quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if ("textRenderingOptimization" in ctx) {
      (ctx as any).textRenderingOptimization = "optimizeQuality";
    }

    // Scale context for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    this.ctx = ctx;
    // Store logical dimensions (CSS size), not physical canvas dimensions
    this.width = this.canvas.width / dpr;
    this.height = this.canvas.height / dpr;
    this.trackConfig = { length: 0, timeSignature: [4, 4], bpm: 120 };
    this.track = { ...this.trackConfig, notes: [] };
    this.trackInfo = {
      lengthInPixels: 0,
      totalBars: 0,
      beatHeightInPixels: 0,
      barHeightInPixels: 0,
    };

    // Initialize snap animation state
    this.snapState = createSnapAnimationState();

    // Setup drag-to-scroll handler
    this.dragHandler = new DragHandler(this.canvas, {
      onDragStart: () => {
        cancelSnapAnimation(this.snapState);
      },
      onDragMove: (deltaX, deltaY) => {
        cancelSnapAnimation(this.snapState);
        const bounds = getScrollBounds(
          this.trackInfo,
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
      },
      onDragEnd: () => {
        const bounds = getScrollBounds(
          this.trackInfo,
          this.width,
          this.height,
          false
        );
        startSnapBack(
          this.snapState,
          { scrollX: this.scrollX, scrollY: this.scrollY },
          bounds
        );
      },
    });

    // Setup mouse handlers
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
  }

  setCrdt(crdt: Crdt): void {
    if (this.unsubscribeCrdt) {
      this.unsubscribeCrdt();
    }

    this.crdt = crdt;

    // Subscribe to notes changes and update track directly
    this.unsubscribeCrdt = crdt.subscribeNotes(() => {
      this.updateNotesFromCrdt();
    });

    this.updateNotesFromCrdt();
  }

  private updateNotesFromCrdt(): void {
    if (!this.crdt) return;
    this.track = {
      ...this.trackConfig,
      notes: this.crdt.getNotesByPitch(),
    };
  }

  render(config: TrackConfig) {
    this.trackConfig = config;
    this.track = { ...config, notes: this.crdt?.getNotesByPitch() ?? [] };
    if (this.track.length === 0) return;
    this.recalculateTrackInfo();
    this.destroyed = false;
    requestAnimationFrame(() => this.innerLoop());
  }

  destroy() {
    this.destroyed = true;
    this.dragHandler.destroy();
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);

    // Unsubscribe from CRDT
    if (this.unsubscribeCrdt) {
      this.unsubscribeCrdt();
      this.unsubscribeCrdt = null;
    }
    this.crdt = null;
  }

  private handleMouseMove = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;

    if (this.isResizingNote) {
      // Handle resize drag
      this.handleResizeDrag();
      this.updateCursor();
    } else {
      this.updateHoveredNote();
      this.updateCursor();
    }

    // Update note creation end beat during drag
    if (this.isCreatingNote && this.mouseY !== null) {
      const offsetY = PITCH_RULER_HEIGHT + this.scrollY;
      const cellHeight = BEAT_SIZE + NOTE_SPACING_Y;
      const relativeY = this.mouseY - offsetY;
      this.noteCreationEndBeat = Math.round(relativeY / cellHeight);
    }
  };

  private handleMouseLeave = () => {
    this.mouseX = null;
    this.mouseY = null;
    this.hoveredNoteId = null;
    this.hoveredNotePitch = null;
    this.hoveredNoteStartTime = null;
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
  };

  private handleResizeDrag(): void {
    if (
      !this.crdt ||
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

    const notesMap = this.crdt.getNotesMap();
    const noteData = notesMap.get(this.resizingNoteId);
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

      this.crdt.updateNote(this.resizingNoteId, {
        startTime: newStartTime,
        duration: newDuration,
      });
    } else if (this.resizingHandle === "end") {
      if (wasSingleBeat) {
        // For single beat notes resizing from "end" handle,
        // allow resizing in either direction based on mouse position
        // For single-beat notes: originalEndTime = originalStartTime

        if (targetBeat < this.resizingNoteOriginalStartTime) {
          // Resizing backwards (upward): move startTime and keep duration 1
          const newStartTime = Math.max(0, targetBeat);
          this.crdt.updateNote(this.resizingNoteId, {
            startTime: newStartTime,
            duration: 1,
          });
        } else if (targetBeat > this.resizingNoteOriginalStartTime) {
          // Resizing forwards (downward): keep startTime, increase duration
          // For single-beat notes, any targetBeat > originalStartTime means extend down
          const newDuration = Math.max(
            1,
            targetBeat - this.resizingNoteOriginalStartTime + 1
          );
          this.crdt.updateNote(this.resizingNoteId, {
            duration: newDuration,
          });
        }
        // else: targetBeat == originalStartTime (same position) - don't change anything
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

        this.crdt.updateNote(this.resizingNoteId, {
          duration: newDuration,
        });
      }
    }
  }

  private updateCursor(): void {
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
    this.hoveredNotePitch = null;
    this.hoveredNoteStartTime = null;
    this.hoveredResizeHandle = null;

    if (!this.crdt || this.mouseX === null || this.mouseY === null) return;

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

    // Get all notes and find which one is hovered
    const notesMap = this.crdt.getNotesMap();
    const handleHitRadius = BEAT_SIZE / 3; // Radius for detecting handle hover

    for (const [noteId, noteData] of notesMap) {
      // Check if this note matches the pitch column
      if (noteData.pitch !== pitchIndex) continue;

      // Calculate note bounds (endTime is inclusive: startTime + duration - 1)
      const noteStartY =
        noteData.startTime *
          (this.trackInfo.beatHeightInPixels + NOTE_SPACING_Y) -
        BEAT_SIZE / 2;
      const noteEndY =
        (noteData.startTime + noteData.duration - 1) *
          (this.trackInfo.beatHeightInPixels + NOTE_SPACING_Y) +
        BEAT_SIZE / 2;

      // Check if mouse is within the note vertical bounds
      if (
        relativeY >= noteStartY - BEAT_SIZE / 3 &&
        relativeY <= noteEndY + BEAT_SIZE / 3
      ) {
        // Found the hovered note
        this.hoveredNoteId = noteId;
        this.hoveredNotePitch = noteData.pitch;
        this.hoveredNoteStartTime = noteData.startTime;

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
    // Only handle left-click
    if (event.button !== 0) return;

    // If clicking on a resize handle, start resizing
    if (
      this.hoveredResizeHandle !== null &&
      this.hoveredNoteId !== null &&
      this.crdt
    ) {
      const notesMap = this.crdt.getNotesMap();
      const noteData = notesMap.get(this.hoveredNoteId);
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
    if (this.hoveredNoteId !== null && this.crdt) {
      this.crdt.deleteNote(this.hoveredNoteId);
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
      id: this.crdt!.generateNoteId(userId),
      pitch,
      startTime: minBeat,
      duration,
      velocity: 100,
      createdAt: Date.now(),
      createdBy: userId,
    };

    this.crdt?.addNote(noteData);
  };

  private recalculateTrackInfo() {
    const totalBeats = (this.track.length * this.track.bpm) / 60;
    const beatsPerBar = this.track.timeSignature[0];
    const bars = totalBeats / beatsPerBar;
    this.trackInfo.lengthInPixels = bars * TIME_RULER_WIDTH;
    this.trackInfo.totalBars = bars;
    this.trackInfo.beatHeightInPixels = BEAT_SIZE;
    this.trackInfo.barHeightInPixels =
      this.trackInfo.beatHeightInPixels * beatsPerBar;
  }

  private innerLoop() {
    if (this.destroyed) return;

    // Update snap-back animation
    const newScroll = updateSnapAnimation(
      this.snapState,
      { scrollX: this.scrollX, scrollY: this.scrollY },
      performance.now()
    );
    this.scrollX = newScroll.scrollX;
    this.scrollY = newScroll.scrollY;

    const ctx = this.ctx;
    // clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Calculate offsets for the main drawing area
    const offsetX = TIME_RULER_WIDTH + this.scrollX;
    const offsetY = PITCH_RULER_HEIGHT + this.scrollY;

    renderBackground(
      ctx,
      this.trackInfo,
      this.width,
      this.height,
      offsetX,
      offsetY
    );
    renderNoteGrid(ctx, offsetX, offsetY);
    renderNotes(
      ctx,
      this.track,
      this.trackInfo,
      offsetX,
      offsetY,
      this.hoveredNotePitch,
      this.hoveredNoteStartTime
    );

    // Render note creation preview during drag
    if (
      this.isCreatingNote &&
      this.noteCreationPitch !== null &&
      this.noteCreationStartBeat !== null &&
      this.noteCreationEndBeat !== null
    ) {
      renderNoteCreationPreview(
        ctx,
        this.trackInfo,
        offsetX,
        offsetY,
        this.noteCreationPitch,
        this.noteCreationStartBeat,
        this.noteCreationEndBeat
      );
    }

    if (
      this.mouseX !== null &&
      this.mouseY !== null &&
      !this.isCreatingNote &&
      !this.hoveredNoteId
    ) {
      renderMousePlaceholder(ctx, this.mouseX, this.mouseY, offsetX, offsetY);
    }

    renderTimeRuler(ctx, this.track, this.trackInfo, this.height, offsetY);
    renderPitchRuler(ctx, this.width);

    requestAnimationFrame(() => this.innerLoop());
  }
}
