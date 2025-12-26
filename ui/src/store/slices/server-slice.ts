import type { StateCreator } from "zustand";
import type { ServerStats } from "@/types/data";
import { WS_CLIENT } from "@/lib/websocket";
import type { ServerMessage } from "@the-song/protocol";

export interface ServerSlice {
  // State
  serverStats: ServerStats;
}

export const createServerSlice: StateCreator<
  ServerSlice,
  [],
  [],
  ServerSlice
> = (set) => {
  WS_CLIENT.on("message", (event) => {
    if (event.name !== "message") {
      return;
    }
    const message: ServerMessage = event.data;
    const payload = message.payload;
    if (!payload) {
      return;
    }
    switch (payload.case) {
      case "welcome": {
        if (payload.value.stats) {
          set({
            serverStats: { online_users: payload.value.stats.onlineUsers },
          });
        }
        break;
      }
      case "stats": {
        if (payload.value.stats) {
          set({
            serverStats: { online_users: payload.value.stats.onlineUsers },
          });
        }
        break;
      }
    }
  });
  return {
    // Initial state
    serverStats: {
      online_users: 0,
    },
  };
};
