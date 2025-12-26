import {
  PITCH_RULER_HEIGHT,
  TIME_RULER_WIDTH,
  NOTE_SPACING_Y,
} from "@/config";
import type { RenderBoundary, SongInfo } from "./types";
import {
  LINE_WIDTHS,
  PLAYHEAD_SHADOW_BLUR,
  PLAYHEAD_TRIANGLE_HEIGHT,
  PLAYHEAD_TRIANGLE_WIDTH,
} from "./render-constants";

export function renderPlayhead(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  songInfo: SongInfo,
  currentBeat: number,
  accentColor: string
): void {
  const playheadY =
    boundary.y + currentBeat * (songInfo.beatHeightInPixels + NOTE_SPACING_Y);

  // Only draw if visible within boundary
  if (playheadY < PITCH_RULER_HEIGHT || playheadY > boundary.height) {
    return;
  }

  ctx.save();

  // Glow effect
  ctx.shadowBlur = PLAYHEAD_SHADOW_BLUR;
  ctx.shadowColor = accentColor;

  // Main line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = LINE_WIDTHS.playhead;
  ctx.beginPath();
  ctx.moveTo(TIME_RULER_WIDTH, playheadY);
  ctx.lineTo(boundary.width, playheadY);
  ctx.stroke();

  // Triangle indicator on time ruler side
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(TIME_RULER_WIDTH, playheadY);
  ctx.lineTo(
    TIME_RULER_WIDTH - PLAYHEAD_TRIANGLE_WIDTH,
    playheadY - PLAYHEAD_TRIANGLE_HEIGHT
  );
  ctx.lineTo(
    TIME_RULER_WIDTH - PLAYHEAD_TRIANGLE_WIDTH,
    playheadY + PLAYHEAD_TRIANGLE_HEIGHT
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
