import { WS_CLIENT } from "@/lib/websocket";
import type { StateCreator } from "zustand";
import type { ServerMessage } from "@the-song/protocol";

export interface UserSlice {
  // State
  userId: string | null;
}

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (
  set
) => {
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
      case "welcome":
        set({ userId: payload.value.userId });
        break;
    }
  });
  return {
    // Initial state
    userId: null,
  };
};
