import { create } from "zustand";
import { WS_CLIENT, WsStatus } from "@/lib/websocket";
import type { ServerMessage } from "@/types/server";
import type { ServerStats } from "@/types/data";

interface WebSocketState {
  // State
  status: WsStatus;
  serverStats: ServerStats;

  // Actions
  init: () => void;
  disconnect: () => void;
  send: (message: string) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  // Subscribe to WebSocket events
  WS_CLIENT.on("connected", () => {
    console.log("[Store] WebSocket connected");
    set({ status: WsStatus.Connected });
  });

  WS_CLIENT.on("disconnected", () => {
    console.log("[Store] WebSocket disconnected");
    set((state) => ({ ...state, status: WsStatus.Disconnected }));
  });

  WS_CLIENT.on("reconnecting", () => {
    console.log("[Store] WebSocket reconnecting");
    set((state) => ({ ...state, status: WsStatus.Reconnecting }));
  });

  WS_CLIENT.on("message", (event) => {
    if (event.name !== "message") {
      return;
    }
    console.log("[Store] WebSocket message received:", event.data);
    try {
      const message: ServerMessage = JSON.parse(event.data);

      if (message.kind === "stats") {
        set((state) => ({ ...state, serverStats: message.stats }));
      }
    } catch (error) {
      console.error("[Store] Failed to parse server message:", error);
    }
  });

  return {
    // Initial state
    status: WsStatus.Initial,
    serverStats: {
      online_users: 0,
    },

    // Actions
    init: () => {
      const currentStatus = get().status;
      if (
        currentStatus === WsStatus.Initial ||
        currentStatus === WsStatus.Disconnected
      ) {
        console.log("[Store] Initializing WebSocket connection");
        set({ status: WsStatus.Connecting });
        WS_CLIENT.connect();
        return;
      }
      console.log("[Store] Already connected or connecting");
    },

    disconnect: () => {
      console.log("[Store] Disconnecting WebSocket");
      WS_CLIENT.disconnect();
    },

    send: (message: string) => {
      const currentStatus = get().status;
      if (currentStatus !== "connected") {
        console.warn("[Store] Cannot send message - not connected");
        return;
      }
      WS_CLIENT.send(message);
    },
  };
});
