import {
  PITCH_RULER_HEIGHT,
  TIME_RULER_WIDTH,
  BEAT_SIZE,
  NOTE_SPACING_X,
  NOTE_SPACING_Y,
  BEAT_HALF_SIZE,
} from "@/config";
import type { Crdt } from "@/lib/crdt";
import type { NoteIdsByPitch, RenderBoundary, SongInfo } from "./types";
import {
  COLORS,
  NOTE_HOVER_BORDER_WIDTH,
  NOTE_HOVER_SHADOW_BLUR,
  PLACEHOLDER_ALPHA,
  PLACEHOLDER_LINE_DASH,
  PLACEHOLDER_LINE_WIDTH,
} from "./render-constants";
import {
  calculateCellDimensions,
  calculateInitialX,
  getAccentFillStyle,
} from "./render-utils";

export function renderNotes(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  songInfo: SongInfo,
  noteIdsByPitch: NoteIdsByPitch,
  crdt: Crdt,
  hoveredNoteId: string | null,
  accentColor: string
): void {
  ctx.save();
  ctx.fillStyle = accentColor;

  const initialX = calculateInitialX(boundary.x);
  const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;

  for (let pitch = 0; pitch < noteIdsByPitch.length; pitch++) {
    const pitchX = initialX + pitch * cellWidth;

    // Skip pitches outside horizontal boundary
    if (
      pitchX + BEAT_HALF_SIZE < 0 ||
      pitchX - BEAT_HALF_SIZE > boundary.width
    ) {
      continue;
    }

    const noteIds = noteIdsByPitch[pitch];
    for (const noteId of noteIds) {
      const noteData = crdt.getNote(noteId);
      if (!noteData) continue;

      const duration = noteData.duration;
      const noteHeight =
        songInfo.beatHeightInPixels * duration +
        NOTE_SPACING_Y * Math.max(0, duration - 1);

      const noteX = pitchX - BEAT_HALF_SIZE;
      const noteY =
        boundary.y +
        noteData.startTime * (songInfo.beatHeightInPixels + NOTE_SPACING_Y);

      // Skip notes outside vertical boundary
      if (noteY + noteHeight < 0 || noteY > boundary.height) {
        continue;
      }

      const isHovered = hoveredNoteId === noteId;
      if (isHovered) {
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = NOTE_HOVER_SHADOW_BLUR;
        ctx.shadowColor = accentColor;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = COLORS.whiteKey;
        ctx.lineWidth = NOTE_HOVER_BORDER_WIDTH;
        ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
        ctx.fill();
        ctx.closePath();
      }
    }
  }
  ctx.restore();
}

export function renderMousePlaceholder(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  mouseX: number,
  mouseY: number,
  accentColor: string
): void {
  if (mouseX < TIME_RULER_WIDTH || mouseY < PITCH_RULER_HEIGHT) {
    return;
  }

  const { width: cellWidth, height: cellHeight } = calculateCellDimensions();
  const initialX = calculateInitialX(boundary.x);

  const relativeX = mouseX - initialX;
  const relativeY = mouseY - boundary.y;

  const pitchIndex = Math.round(relativeX / cellWidth);
  const beatIndex = Math.round(relativeY / cellHeight);

  if (pitchIndex < 0 || beatIndex < 0) {
    return;
  }

  const snappedX = initialX + pitchIndex * cellWidth;
  const snappedY = boundary.y + beatIndex * cellHeight;

  // Skip if outside boundary
  if (
    snappedX < 0 ||
    snappedX > boundary.width ||
    snappedY < 0 ||
    snappedY > boundary.height
  ) {
    return;
  }

  const virtualNoteLength = 1;
  const noteHeight =
    BEAT_SIZE * virtualNoteLength + NOTE_SPACING_Y * (virtualNoteLength - 1);
  const noteX = snappedX - BEAT_HALF_SIZE;
  const noteY = snappedY;

  ctx.save();
  ctx.fillStyle = getAccentFillStyle(accentColor, PLACEHOLDER_ALPHA);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = PLACEHOLDER_LINE_WIDTH;
  ctx.setLineDash([...PLACEHOLDER_LINE_DASH]);

  ctx.beginPath();
  ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function renderNoteCreationPreview(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  songInfo: SongInfo,
  pitch: number,
  startBeat: number,
  endBeat: number,
  accentColor: string
): void {
  const minBeat = Math.min(startBeat, endBeat);
  const maxBeat = Math.max(startBeat, endBeat);
  const duration = maxBeat - minBeat + 1;

  const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;
  const initialX = calculateInitialX(boundary.x);
  const pitchX = initialX + pitch * cellWidth;

  const noteHeight =
    songInfo.beatHeightInPixels * duration +
    NOTE_SPACING_Y * Math.max(0, duration - 1);

  const noteX = pitchX - BEAT_HALF_SIZE;
  const noteY =
    boundary.y + minBeat * (songInfo.beatHeightInPixels + NOTE_SPACING_Y);

  // Skip if outside boundary
  if (
    noteX + BEAT_SIZE < 0 ||
    noteX > boundary.width ||
    noteY + noteHeight < 0 ||
    noteY > boundary.height
  ) {
    return;
  }

  ctx.save();
  ctx.fillStyle = getAccentFillStyle(accentColor, PLACEHOLDER_ALPHA);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = PLACEHOLDER_LINE_WIDTH;
  ctx.setLineDash([...PLACEHOLDER_LINE_DASH]);

  ctx.beginPath();
  ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();

  ctx.restore();
}
