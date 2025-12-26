import { PITCH_RULER_HEIGHT, TIME_RULER_WIDTH } from "@/config";
import type { RenderBoundary, SongInfo } from "./types";
import { COLORS } from "./render-constants";

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary,
  songInfo: SongInfo
): void {
  const contentWidth = boundary.width - TIME_RULER_WIDTH;

  for (let i = 0; i < songInfo.totalBars; i++) {
    const barY = i * songInfo.barHeightInPixels;
    const barScreenY = barY + boundary.y;

    // Skip bars outside visible area
    if (barScreenY + songInfo.barHeightInPixels < PITCH_RULER_HEIGHT) {
      continue;
    }
    if (barScreenY > boundary.height) {
      break;
    }

    const isOdd = i % 2 === 0;
    const backgroundColor = isOdd
      ? COLORS.backgroundOdd
      : COLORS.backgroundEven;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(
      TIME_RULER_WIDTH,
      barScreenY,
      contentWidth,
      songInfo.barHeightInPixels
    );
  }
}
