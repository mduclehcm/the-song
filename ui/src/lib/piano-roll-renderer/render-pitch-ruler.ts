import {
  PITCH_RULER_HEIGHT,
  BEAT_SIZE,
  NOTE_SPACING_X,
  BEAT_HALF_SIZE,
  TOTAL_PITCHES,
} from "@/config";
import type { RenderBoundary } from "./types";
import {
  BLACK_KEY_HEIGHT_RATIO,
  BLACK_KEY_X_OFFSET,
  COLORS,
  FONTS,
  KEY_TOP_MARGIN,
  KEY_WIDTHS,
  LINE_WIDTHS,
  OCTAVE_LABEL_BOTTOM_OFFSET,
} from "./render-constants";
import { calculateInitialX, isBlackKey } from "./render-utils";

export function renderPitchRuler(
  ctx: CanvasRenderingContext2D,
  boundary: RenderBoundary
): void {
  const initialX = calculateInitialX(boundary.x);
  const keyHeight = PITCH_RULER_HEIGHT - KEY_TOP_MARGIN;
  const blackKeyHeight = keyHeight * BLACK_KEY_HEIGHT_RATIO;
  const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;

  ctx.save();

  // Draw white keys first
  for (let pitch = 0; pitch < TOTAL_PITCHES; pitch++) {
    if (!isBlackKey(pitch)) {
      let x = initialX + pitch * cellWidth - BEAT_HALF_SIZE;
      let width = cellWidth;

      const [exteriorLeft, interiorRight] = KEY_WIDTHS[pitch % 12];
      if (exteriorLeft === 1) {
        x -= BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
        width += BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
      }
      if (interiorRight === 1) {
        width += BEAT_HALF_SIZE;
      }

      // Skip if outside boundary
      if (x > boundary.width || x + width < 0) {
        continue;
      }

      ctx.fillStyle = COLORS.whiteKey;
      ctx.fillRect(x, 0, width, keyHeight);

      ctx.strokeStyle = COLORS.whiteKeyBorder;
      ctx.lineWidth = LINE_WIDTHS.keyBorder;
      ctx.strokeRect(x, 0, width, keyHeight);
    }
  }

  // Draw black keys on top
  for (let pitch = 0; pitch < TOTAL_PITCHES; pitch++) {
    if (isBlackKey(pitch)) {
      let x =
        initialX + pitch * cellWidth - BEAT_HALF_SIZE - BLACK_KEY_X_OFFSET;
      let width = BEAT_SIZE + BLACK_KEY_X_OFFSET * 2;

      const [exteriorLeft, interiorRight] = KEY_WIDTHS[pitch % 12];
      if (exteriorLeft === 1) {
        x -= BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
        width += BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
      }
      if (interiorRight === 1) {
        width += BEAT_HALF_SIZE;
      }

      // Skip if outside boundary
      if (x > boundary.width || x + width < 0) {
        continue;
      }

      ctx.fillStyle = COLORS.blackKey;
      ctx.fillRect(x, 0, width, blackKeyHeight);

      ctx.strokeStyle = COLORS.blackKey;
      ctx.lineWidth = LINE_WIDTHS.keyBorder;
      ctx.strokeRect(x, 0, width, blackKeyHeight);
    }
  }

  // Draw octave markers (C notes)
  ctx.fillStyle = COLORS.octaveLabel;
  ctx.font = FONTS.octaveLabel;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  for (let pitch = 0; pitch < TOTAL_PITCHES; pitch += 12) {
    const octave = Math.floor(pitch / 12);
    let x = initialX + pitch * cellWidth - BEAT_HALF_SIZE - BLACK_KEY_X_OFFSET;
    let width = BEAT_SIZE + BLACK_KEY_X_OFFSET * 2;

    const [exteriorLeft, interiorRight] = KEY_WIDTHS[pitch % 12];
    if (exteriorLeft === 1) {
      x -= BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
      width += BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
    }
    if (interiorRight === 1) {
      width += BEAT_HALF_SIZE;
    }

    const labelX = x + width / 2;
    if (labelX < 0 || labelX > boundary.width) {
      continue;
    }

    ctx.fillText(
      `C${octave}`,
      labelX,
      PITCH_RULER_HEIGHT - OCTAVE_LABEL_BOTTOM_OFFSET
    );
  }

  ctx.restore();
}
