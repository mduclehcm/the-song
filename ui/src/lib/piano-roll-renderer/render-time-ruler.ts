import { PITCH_RULER_HEIGHT, TIME_RULER_WIDTH, NOTE_SPACING_Y } from "@/config";
import { SONG_STRUCTURE } from "@/lib/midi-player";
import type { RenderBoundary, SongConfig, SongInfo } from "./types";
import {
  COLORS,
  FONTS,
  LINE_WIDTHS,
  SECTION_LABEL_PADDING_BOTTOM,
  SECTION_LABEL_PADDING_TOP,
  SECTION_LABEL_X_OFFSET,
  TIME_RULER_LABEL_OFFSET,
  TIME_RULER_MAJOR_TICK_LENGTH,
  TIME_RULER_MINOR_TICK_LENGTH,
} from "./render-constants";
import { getSectionColor } from "./render-utils";

export function renderTimeRuler(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  songConfig: SongConfig,
  songInfo: SongInfo
): void {
  // Draw background
  ctx.save();
  ctx.fillStyle = COLORS.timeRulerBackground;
  ctx.fillRect(0, 0, TIME_RULER_WIDTH, boundary.height);
  ctx.restore();

  // Calculate pixels per second
  const pixelsPerSecond =
    (songConfig.bpm / 60) * (songInfo.beatHeightInPixels + NOTE_SPACING_Y);
  const maxTime = songConfig.length;

  // Draw song sections
  renderSections(ctx, boundary, pixelsPerSecond);

  // Draw ticks
  renderTicks(ctx, boundary, pixelsPerSecond, maxTime);
}

function renderSections(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  pixelsPerSecond: number
): void {
  ctx.save();
  ctx.textAlign = "right";

  SONG_STRUCTURE.forEach((section) => {
    const startY = (section.startTime / 10) * pixelsPerSecond * 10 + boundary.y;
    const endY = (section.endTime / 10) * pixelsPerSecond * 10 + boundary.y;

    // Skip sections outside boundary
    if (endY < 0 || startY > boundary.height) {
      return;
    }

    // Draw section background
    ctx.fillStyle = getSectionColor(section.section, 0.2);
    ctx.fillRect(0, startY, TIME_RULER_WIDTH, endY - startY);

    // Draw section label
    const labelText = section.section.toUpperCase();
    ctx.font = FONTS.sectionLabel;
    const textWidth = ctx.measureText(labelText).width;

    const naturalY = startY + SECTION_LABEL_PADDING_TOP;
    const stickyY = PITCH_RULER_HEIGHT + SECTION_LABEL_PADDING_TOP;
    const maxY = endY - textWidth - SECTION_LABEL_PADDING_BOTTOM;

    let labelY = startY >= PITCH_RULER_HEIGHT ? naturalY : stickyY;
    labelY = Math.min(labelY, maxY);

    const hasRoom =
      endY - startY >=
      textWidth + SECTION_LABEL_PADDING_TOP + SECTION_LABEL_PADDING_BOTTOM;
    const isVisible =
      labelY + textWidth >= 0 && labelY + textWidth <= boundary.height;

    if (hasRoom && isVisible) {
      ctx.save();
      ctx.translate(SECTION_LABEL_X_OFFSET, labelY);
      ctx.rotate(-Math.PI / 2);
      ctx.font = FONTS.sectionLabel;
      ctx.fillStyle = getSectionColor(section.section, 1);
      ctx.fillText(labelText, 0, 0);
      ctx.restore();
    }
  });

  ctx.restore();
}

function renderTicks(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  pixelsPerSecond: number,
  maxTime: number
): void {
  ctx.save();
  ctx.strokeStyle = COLORS.timeRulerTick;
  ctx.fillStyle = COLORS.timeRulerTick;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  // Minor ticks (every 0.1 second)
  ctx.lineWidth = LINE_WIDTHS.minorTick;
  ctx.beginPath();
  for (let time = 0; time <= maxTime * 10; time += 1) {
    const y = (time / 10) * pixelsPerSecond + boundary.y;

    if (y < 0 || y > boundary.height) continue;
    if (time % 10 === 0) continue;

    ctx.moveTo(TIME_RULER_WIDTH - TIME_RULER_MINOR_TICK_LENGTH, y);
    ctx.lineTo(TIME_RULER_WIDTH, y);
  }
  ctx.stroke();

  // Major ticks (every 1 second) with labels
  ctx.lineWidth = LINE_WIDTHS.majorTick;
  ctx.font = FONTS.timeLabel;
  ctx.beginPath();
  for (let time = 0; time <= maxTime; time += 1) {
    const y = time * pixelsPerSecond + boundary.y;

    if (y < 0 || y > boundary.height) continue;

    ctx.moveTo(TIME_RULER_WIDTH - TIME_RULER_MAJOR_TICK_LENGTH, y);
    ctx.lineTo(TIME_RULER_WIDTH, y);
    ctx.fillText(
      `${time.toFixed(0)}s`,
      TIME_RULER_WIDTH - TIME_RULER_LABEL_OFFSET,
      y
    );
  }
  ctx.stroke();

  ctx.restore();
}
