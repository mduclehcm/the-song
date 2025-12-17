import type { ServerStats } from "@/types/data";

export interface ServerStatsMessage {
  kind: "stats";
  stats: ServerStats;
}

export type ServerMessage = ServerStatsMessage;
