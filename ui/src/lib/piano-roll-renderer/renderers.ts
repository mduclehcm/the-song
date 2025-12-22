import {
  TIME_RULER_WIDTH,
  PITCH_RULER_HEIGHT,
  BEAT_SIZE,
  NOTE_SPACING_X,
  NOTE_SPACING_Y,
  BEAT_HALF_SIZE,
  TOTAL_PITCHES,
} from "@/config";
import type { Crdt } from "@/lib/crdt";
import type { NoteIdsByPitch, SongConfig, SongInfo } from "./types";

// [number1,number2][]
// number1: exterior width to the left
// number2: interior width to the right
// 0..12
const KEY_WIDTHS = [
  [0, 1], // C
  [0, 0], // C#
  [1, 1], // D
  [0, 0], // D#
  [1, 0], // E
  [0, 1], // F
  [0, 0], // F#
  [1, 1], // G
  [0, 0], // G#
  [1, 1], // A
  [0, 0], // A#
  [1, 0], // B
];

export function renderPitchRuler(
  ctx: CanvasRenderingContext2D,
  offsetX: number
): void {
  const initialX = offsetX + 10 + NOTE_SPACING_X * 2;

  const keyHeight = PITCH_RULER_HEIGHT - 20;
  const blackKeyHeight = keyHeight * 0.7;

  // Black key pattern in octave: C# D# _ F# G# A# _
  // Indices:                     1  3  _ 6  8  10 _
  const blackKeyPattern = [1, 3, 6, 8, 10];
  const isBlackKey = (pitch: number) => blackKeyPattern.includes(pitch % 12);

  ctx.save();

  // Draw white keys first
  for (let pitch = 0; pitch < TOTAL_PITCHES; pitch++) {
    if (!isBlackKey(pitch)) {
      let x =
        initialX + pitch * (BEAT_SIZE + NOTE_SPACING_X * 2) - BEAT_HALF_SIZE;
      let width = BEAT_SIZE + NOTE_SPACING_X * 2;

      const [exteriorLeft, interiorRight] = KEY_WIDTHS[pitch % 12];
      if (exteriorLeft === 1) {
        x -= BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
        width += BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
      }
      if (interiorRight === 1) {
        width += BEAT_HALF_SIZE;
      }

      // White key
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, 0, width, keyHeight);

      // Border
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, 0, width, keyHeight);
    }
  }

  // Draw black keys on top
  for (let pitch = 0; pitch < TOTAL_PITCHES; pitch++) {
    if (isBlackKey(pitch)) {
      let x =
        initialX +
        pitch * (BEAT_SIZE + NOTE_SPACING_X * 2) -
        BEAT_HALF_SIZE -
        5;
      let width = BEAT_SIZE + 10;

      const [exteriorLeft, interiorRight] = KEY_WIDTHS[pitch % 12];
      if (exteriorLeft === 1) {
        x -= BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
        width += BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
      }
      if (interiorRight === 1) {
        width += BEAT_HALF_SIZE;
      }
      // Black key
      ctx.fillStyle = "#000";
      ctx.fillRect(x, 0, width, blackKeyHeight);

      // Border and highlight for 3D effect
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, 0, width, blackKeyHeight);
    }
  }

  // Draw octave markers (C notes)
  ctx.fillStyle = "#888888";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  for (let pitch = 0; pitch < TOTAL_PITCHES; pitch += 12) {
    const octave = Math.floor(pitch / 12);
    let x =
      initialX + pitch * (BEAT_SIZE + NOTE_SPACING_X * 2) - BEAT_HALF_SIZE - 5;
    let width = BEAT_SIZE + 10;
    const [exteriorLeft, interiorRight] = KEY_WIDTHS[pitch % 12];
    if (exteriorLeft === 1) {
      x -= BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
      width += BEAT_HALF_SIZE + NOTE_SPACING_X * 2;
    }
    if (interiorRight === 1) {
      width += BEAT_HALF_SIZE;
    }
    ctx.fillText(`C${octave}`, x + width / 2, PITCH_RULER_HEIGHT - 25);
  }

  ctx.restore();
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  songInfo: SongInfo,
  width: number,
  height: number,
  _offsetX: number,
  offsetY: number
): void {
  // Calculate the visible content area width
  const contentWidth = width - TIME_RULER_WIDTH;

  for (let i = 0; i < songInfo.totalBars; i++) {
    const barY = i * songInfo.barHeightInPixels;

    // Render bars that are visible in the viewport
    if (barY + offsetY + songInfo.barHeightInPixels < PITCH_RULER_HEIGHT) {
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
      songInfo.barHeightInPixels
    );
  }
}

export function renderTimeRuler(
  ctx: CanvasRenderingContext2D,
  songConfig: SongConfig,
  songInfo: SongInfo,
  height: number,
  offsetY: number
): void {
  ctx.save();
  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(0, 0, TIME_RULER_WIDTH, height);

  // Calculate pixels per second
  // Bpm beats per minute = (bpm/60) beats per second
  // Pixels per second = (bpm/60) * beatHeightInPixels
  const pixelsPerSecond =
    (songConfig.bpm / 60) * (songInfo.beatHeightInPixels + NOTE_SPACING_Y);

  ctx.strokeStyle = "#666";
  ctx.fillStyle = "#ccc";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const maxTime = songConfig.length;

  // Draw minor ticks (every 0.1 second)
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let time = 0; time <= maxTime * 10; time += 1) {
    const y = (time / 10) * pixelsPerSecond + offsetY;
    if (y < PITCH_RULER_HEIGHT || y > height) continue;

    if (time % 10 === 0) continue;
    // Draw shorter tick mark
    ctx.moveTo(TIME_RULER_WIDTH - 5, y);
    ctx.lineTo(TIME_RULER_WIDTH, y);
  }
  ctx.stroke();

  // Draw major ticks (every 1 second) with labels
  ctx.beginPath();
  ctx.lineWidth = 2;
  for (let time = 0; time <= maxTime; time += 1) {
    const y = time * pixelsPerSecond + offsetY;
    if (y < PITCH_RULER_HEIGHT || y > height) continue;

    // Draw tick mark
    ctx.moveTo(TIME_RULER_WIDTH - 10, y);
    ctx.lineTo(TIME_RULER_WIDTH, y);

    ctx.fillText(`${time.toFixed(0)}s`, TIME_RULER_WIDTH - 12, y);
  }
  ctx.stroke();
  ctx.restore();
}

export function renderNotes(
  ctx: CanvasRenderingContext2D,
  _songConfig: SongConfig,
  songInfo: SongInfo,
  noteIdsByPitch: NoteIdsByPitch,
  crdt: Crdt,
  offsetX: number,
  offsetY: number,
  hoveredNoteId: string | null,
  accentColor: string
): void {
  ctx.save();
  ctx.fillStyle = accentColor;

  const initialX = offsetX + 10 + NOTE_SPACING_X * 2;

  for (let pitch = 0; pitch < noteIdsByPitch.length; pitch++) {
    // Calculate X position for this pitch
    const pitchX = initialX + pitch * (BEAT_SIZE + NOTE_SPACING_X * 2);

    const noteIds = noteIdsByPitch[pitch];
    for (const noteId of noteIds) {
      const noteData = crdt.getNote(noteId);
      if (!noteData) continue;

      // duration = noteData.duration
      const duration = noteData.duration;
      const noteHeight =
        songInfo.beatHeightInPixels * duration +
        NOTE_SPACING_Y * Math.max(0, duration - 1);

      const noteX = pitchX - BEAT_HALF_SIZE;
      const noteY =
        offsetY -
        BEAT_HALF_SIZE +
        noteData.startTime * (songInfo.beatHeightInPixels + NOTE_SPACING_Y);

      const isHovered = hoveredNoteId === noteId;
      if (isHovered) {
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = 10;
        ctx.shadowColor = accentColor;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
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
  mouseX: number,
  mouseY: number,
  offsetX: number,
  offsetY: number,
  accentColor: string
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

  ctx.save();
  const rgb = hexToRgb(accentColor);
  if (rgb) {
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  } else {
    ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
  }
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function renderNoteCreationPreview(
  ctx: CanvasRenderingContext2D,
  songInfo: SongInfo,
  offsetX: number,
  offsetY: number,
  pitch: number,
  startBeat: number,
  endBeat: number,
  accentColor: string
): void {
  const minBeat = Math.min(startBeat, endBeat);
  const maxBeat = Math.max(startBeat, endBeat);
  const duration = maxBeat - minBeat + 1;

  const cellWidth = BEAT_SIZE + NOTE_SPACING_X * 2;
  const initialX = offsetX + 10 + NOTE_SPACING_X * 2;
  const pitchX = initialX + pitch * cellWidth;

  const noteHeight =
    songInfo.beatHeightInPixels * duration +
    NOTE_SPACING_Y * Math.max(0, duration - 1);

  const noteX = pitchX - BEAT_HALF_SIZE;
  const noteY =
    offsetY -
    BEAT_HALF_SIZE +
    minBeat * (songInfo.beatHeightInPixels + NOTE_SPACING_Y);

  ctx.save();
  const rgb = hexToRgb(accentColor);
  if (rgb) {
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  } else {
    ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
  }
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.roundRect(noteX, noteY, BEAT_SIZE, noteHeight, BEAT_HALF_SIZE);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();

  ctx.restore();
}
