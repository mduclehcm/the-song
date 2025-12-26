/**
 * @deprecated Use imports from '@the-song/protocol' directly instead.
 * This file is kept for backwards compatibility.
 *
 * Note: In protobuf-es v2, message types are type-only exports.
 * Use the Schema exports (e.g., ClientMessageSchema) for runtime operations.
 */

export type {
  ServerMessage,
  ClientMessage,
  ServerWelcome,
  ServerStatsUpdate,
  ServerMousePositions,
  ServerSynthesizerUpdate,
  ClientMouseUpdate,
  ClientSynthesizerUpdate,
  ServerStats,
  MousePosition,
} from "@the-song/protocol";

// Re-export schemas for runtime use
export {
  ServerMessageSchema,
  ClientMessageSchema,
  ServerWelcomeSchema,
  ServerStatsUpdateSchema,
  ServerMousePositionsSchema,
  ServerSynthesizerUpdateSchema,
  ClientMouseUpdateSchema,
  ClientSynthesizerUpdateSchema,
  ServerStatsSchema,
  MousePositionSchema,
} from "@the-song/protocol";
