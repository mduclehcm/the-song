import {
  TIME_RULER_WIDTH,
  PITCH_RULER_HEIGHT,
  BEAT_SIZE,
  NOTE_SPACING_X,
  NOTE_SPACING_Y,
  BEAT_HALF_SIZE,
} from "@/config";
import type { Track, TrackInfo } from "./types";

export function renderPitchRuler(
  ctx: CanvasRenderingContext2D,
  width: number
): void {
  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(0, 0, width, PITCH_RULER_HEIGHT - 10);
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  trackInfo: TrackInfo,
  width: number,
  height: number,
  _offsetX: number,
  offsetY: number
): void {
  // Calculate the visible content area width
  const contentWidth = width - TIME_RULER_WIDTH;

  for (let i = 0; i < trackInfo.totalBars; i++) {
    const barY = i * trackInfo.barHeightInPixels;

    // Render bars that are visible in the viewport
    if (barY + offsetY + trackInfo.barHeightInPixels < PITCH_RULER_HEIGHT) {
      continue;
    }
    if (barY + offsetY > height) break;

    const isOdd = i % 2 === 0;
    const backgroundColor = isOdd ? "#141414" : "#0c0c0c";
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(
      TIME_RULER_WIDTH,
      offsetY + barY,
      contentWidth,
      trackInfo.barHeightInPixels
    );
  }
}

export function renderTimeRuler(
  ctx: CanvasRenderingContext2D,
  track: Track,
  trackInfo: TrackInfo,
  height: number,
  offsetY: number
): void {
  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(0, 0, TIME_RULER_WIDTH, height);

  // Calculate pixels per second
  // Bpm beats per minute = (bpm/60) beats per second
  // Pixels per second = (bpm/60) * beatHeightInPixels
  const pixelsPerSecond =
    (track.bpm / 60) * (trackInfo.beatHeightInPixels + NOTE_SPACING_Y);

  ctx.strokeStyle = "#666";
  ctx.fillStyle = "#ccc";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const maxTime = track.length;

  // Draw major ticks (every 1 second) with labels
  for (let time = 0; time <= maxTime; time += 1) {
    const y = time * pixelsPerSecond + offsetY;
    if (y < PITCH_RULER_HEIGHT || y > height) continue;

    // Draw tick mark
    ctx.beginPath();
    ctx.moveTo(TIME_RULER_WIDTH - 10, y);
    ctx.lineTo(TIME_RULER_WIDTH, y);
    ctx.stroke();

    ctx.fillText(`${time.toFixed(0)}s`, TIME_RULER_WIDTH - 12, y);
  }

  // Draw minor ticks (every 0.1 second)
  ctx.strokeStyle = "#444";
  for (let time = 0; time <= maxTime; time += 0.1) {
    const y = time * pixelsPerSecond + offsetY;
    if (y < PITCH_RULER_HEIGHT || y > height) continue;

    // Skip if it's a major tick (whole second)
    // Use Math.abs to handle floating point precision issues
    if (Math.abs(time % 1) < 0.01) continue;

    // Draw shorter tick mark
    ctx.beginPath();
    ctx.moveTo(TIME_RULER_WIDTH - 5, y);
    ctx.lineTo(TIME_RULER_WIDTH, y);
    ctx.stroke();
  }
}

export function renderNoteGrid(
  _ctx: CanvasRenderingContext2D,
  _offsetX: number,
  _offsetY: number
): void {
  // todo
}

export function renderNotes(
  ctx: CanvasRenderingContext2D,
  track: Track,
  trackInfo: TrackInfo,
  offsetX: number,
  offsetY: number,
  hoveredPitch: number | null = null,
  hoveredStartTime: number | null = null
): void {
  const initialX = offsetX + 10 + NOTE_SPACING_X * 2;

  for (let pitch = 0; pitch < track.notes.length; pitch++) {
    // Calculate X position for this pitch
    const pitchX = initialX + pitch * (BEAT_SIZE + NOTE_SPACING_X * 2);

    for (const note of track.notes[pitch]) {
      // endTime is inclusive, duration = endTime - startTime + 1
      const duration = note.endTime - note.startTime + 1;
      const noteHeight =
        trackInfo.beatHeightInPixels * duration +
        NOTE_SPACING_Y * Math.max(0, duration - 1);

      const noteX = pitchX - BEAT_HALF_SIZE;
      const noteY =
        offsetY -
        BEAT_HALF_SIZE +
        note.startTime * (trackInfo.beatHeightInPixels + NOTE_SPACING_Y);

      const isHovered =
        hoveredPitch === pitch && hoveredStartTime === note.startTime;

      ctx.save();
      if (isHovered) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00ff88";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
      }

      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
      ctx.fill();
      ctx.closePath();
      ctx.restore();
    }
  }
}

export function renderMousePlaceholder(
  ctx: CanvasRenderingContext2D,
  mouseX: number,
  mouseY: number,
  offsetX: number,
  offsetY: number
): void {
  if (mouseX < TIME_RULER_WIDTH || mouseY < PITCH_RULER_HEIGHT) {
    return;
  }

  const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;
  const cellHeight = BEAT_SIZE + NOTE_SPACING_Y;

  const initialX = offsetX + 10 + NOTE_SPACING_X * 2;
  const relativeX = mouseX - initialX;
  const relativeY = mouseY - offsetY;

  const pitchIndex = Math.round(relativeX / cellWidth);
  const beatIndex = Math.round(relativeY / cellHeight);

  const snappedX = initialX + pitchIndex * cellWidth;
  const snappedY = offsetY + beatIndex * cellHeight;

  if (pitchIndex < 0 || beatIndex < 0) {
    return;
  }

  const virtualNoteLength = 1; // beats
  const noteHeight =
    BEAT_SIZE * virtualNoteLength + NOTE_SPACING_Y * (virtualNoteLength - 1);
  const noteX = snappedX - BEAT_HALF_SIZE;
  const noteY = snappedY - BEAT_HALF_SIZE;

  ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function renderNoteCreationPreview(
  ctx: CanvasRenderingContext2D,
  trackInfo: TrackInfo,
  offsetX: number,
  offsetY: number,
  pitch: number,
  startBeat: number,
  endBeat: number
): void {
  const minBeat = Math.min(startBeat, endBeat);
  const maxBeat = Math.max(startBeat, endBeat);
  const duration = maxBeat - minBeat + 1;

  const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;
  const initialX = offsetX + 10 + NOTE_SPACING_X * 2;
  const pitchX = initialX + pitch * cellWidth;

  const noteHeight =
    trackInfo.beatHeightInPixels * duration +
    NOTE_SPACING_Y * Math.max(0, duration - 1);

  const noteX = pitchX - BEAT_HALF_SIZE;
  const noteY =
    offsetY -
    BEAT_HALF_SIZE +
    minBeat * (trackInfo.beatHeightInPixels + NOTE_SPACING_Y);

  ctx.save();
  ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();

  ctx.restore();
}
