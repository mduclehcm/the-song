import type { StateCreator } from "zustand";
import { WS_CLIENT, WsStatus } from "@/lib/websocket";

export interface WebSocketSlice {
  // State
  status: WsStatus;

  // Actions
  init: () => void;
  disconnect: () => void;
  setStatus: (status: WsStatus) => void;
}

// Type for the store update function
type StoreSetFunction = (partial: any) => void;

// Track if subscriptions have been set up
let subscriptionsInitialized = false;

// Setup WebSocket event subscriptions
const setupWebSocketSubscriptions = (set: StoreSetFunction) => {
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
    setupWebSocketSubscriptions(set);

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
});
