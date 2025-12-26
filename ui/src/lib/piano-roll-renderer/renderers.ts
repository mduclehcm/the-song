// Barrel file - re-exports all render functions
export { renderPitchRuler } from "./render-pitch-ruler";
export { renderBackground } from "./render-background";
export { renderTimeRuler } from "./render-time-ruler";
export {
  renderNotes,
  renderMousePlaceholder,
  renderNoteCreationPreview,
} from "./render-notes";
export { renderPlayhead } from "./render-playhead";

// Re-export types from types.ts
export type { RenderBoundary } from "./types";
