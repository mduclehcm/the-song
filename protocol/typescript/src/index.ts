/**
 * Protocol buffer definitions for THE SONG WebSocket messages.
 *
 * This package provides serialization and deserialization for binary messages
 * transported over WebSocket connections.
 *
 * @example
 * ```typescript
 * import { ClientMessage, ServerMessage, ClientMouseUpdate } from '@the-song/protocol';
 * import { create, toBinary, fromBinary } from '@bufbuild/protobuf';
 *
 * // Create and encode a client message
 * const mouseUpdate = create(ClientMouseUpdateSchema, {
 *   x: 100,
 *   y: 200,
 *   vx: 1,
 *   vy: -1,
 * });
 *
 * const msg = create(ClientMessageSchema, {
 *   payload: { case: 'mouseUpdate', value: mouseUpdate }
 * });
 *
 * const bytes = toBinary(ClientMessageSchema, msg);
 *
 * // Decode a message
 * const decoded = fromBinary(ClientMessageSchema, bytes);
 * ```
 */

export * from "./gen/the-song_pb.js";
