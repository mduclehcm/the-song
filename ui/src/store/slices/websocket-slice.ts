import type { StateCreator } from "zustand";
import { WS_CLIENT, WsStatus } from "@/lib/websocket";
import type { ServerMessage } from "@/types/server";

export interface WebSocketSlice {
  // State
  status: WsStatus;

  // Actions
  init: () => void;
  disconnect: () => void;
  send: (message: string) => void;
  setStatus: (status: WsStatus) => void;
}

// Type for the store update function
type StoreSetFunction = (partial: any) => void;
type StoreGetFunction = () => any;

// Track if subscriptions have been set up
let subscriptionsInitialized = false;

// Setup WebSocket event subscriptions
const setupWebSocketSubscriptions = (
  set: StoreSetFunction,
  get: StoreGetFunction
) => {
  if (subscriptionsInitialized) {
    console.log("[Store] WebSocket subscriptions already initialized");
    return;
  }

  console.log("[Store] Setting up WebSocket subscriptions");
  subscriptionsInitialized = true;

  // Subscribe to connection status events
  WS_CLIENT.on("connected", () => {
    console.log("[Store] WebSocket connected");
    set({ status: WsStatus.Connected });
  });

  WS_CLIENT.on("disconnected", () => {
    console.log("[Store] WebSocket disconnected");
    set({ status: WsStatus.Disconnected });
  });

  WS_CLIENT.on("reconnecting", () => {
    console.log("[Store] WebSocket reconnecting");
    set({ status: WsStatus.Reconnecting });
  });

  // Subscribe to message events
  WS_CLIENT.on("message", (event) => {
    if (event.name !== "message") {
      return;
    }
    try {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.kind === "Stats") {
        set({ serverStats: message.data.stats });
      } else if (message.kind === "Welcome") {
        console.log("[Store] Received user ID:", message.data.user_id);
        set({ userId: message.data.user_id });
      } else if (message.kind === "MousePositions") {
        set((state: any) => ({
          mousePositions: {
            ...state.mousePositions,
            ...message.data.positions,
          },
        }));
      }
    } catch (error) {
      console.error("[Store] Failed to parse server message:", error);
    }
  });
};

export const createWebSocketSlice: StateCreator<
  WebSocketSlice,
  [],
  [],
  WebSocketSlice
> = (set, get) => ({
  // Initial state
  status: WsStatus.Initial,

  // Actions
  setStatus: (status: WsStatus) => {
    set({ status });
  },

  init: () => {
    // Setup subscriptions on first init
    setupWebSocketSubscriptions(set, get);

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
});
