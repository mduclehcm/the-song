import type { StateCreator } from "zustand";
import { WS_CLIENT } from "@/lib/websocket";
import type { MousePositions } from "@/types/data";
import type { ClientMouseUpdateMessage } from "@/types/server";
import type { WebSocketSlice } from "./websocket-slice";

export interface MouseSlice {
  // State
  mousePositions: MousePositions;

  // Actions
  setMousePositions: (positions: MousePositions) => void;
  updateMousePositions: (positions: MousePositions) => void;
  sendMouseUpdate: (x: number, y: number, vx: number, vy: number) => void;
}

export const createMouseSlice: StateCreator<
  MouseSlice & WebSocketSlice,
  [],
  [],
  MouseSlice
> = (set, get) => ({
  // Initial state
  mousePositions: {},

  // Actions
  setMousePositions: (positions: MousePositions) => {
    set({ mousePositions: positions });
  },

  updateMousePositions: (positions: MousePositions) => {
    set((state) => ({
      mousePositions: { ...state.mousePositions, ...positions },
    }));
  },

  sendMouseUpdate: (x: number, y: number, vx: number, vy: number) => {
    const currentStatus = get().status;
    if (currentStatus !== "connected") {
      return;
    }
    const message: ClientMouseUpdateMessage = {
      kind: "MouseUpdate",
      x,
      y,
      vx,
      vy,
    };
    WS_CLIENT.send(JSON.stringify(message));
  },
});
