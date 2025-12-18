import type { ServerStats, MousePositions } from "@/types/data";

export interface ServerStatsMessage {
  kind: "Stats";
  data: { stats: ServerStats };
}

export interface ServerWelcomeMessage {
  kind: "Welcome";
  data: { user_id: string; synthesizer_snapshot: Uint8Array };
}

export interface ServerMousePositionsMessage {
  kind: "MousePositions";
  data: { positions: MousePositions };
}

export interface ServerSynthesizerUpdateMessage {
  kind: "SynthesizerUpdate";
  data: { data: Uint8Array };
}

export interface ClientMouseUpdateMessage {
  kind: "MouseUpdate";
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type ServerMessage =
  | ServerStatsMessage
  | ServerWelcomeMessage
  | ServerMousePositionsMessage
  | ServerSynthesizerUpdateMessage;
