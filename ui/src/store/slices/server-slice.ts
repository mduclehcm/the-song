import type { StateCreator } from "zustand";
import type { ServerStats } from "@/types/data";

export interface ServerSlice {
  // State
  serverStats: ServerStats;

  // Actions
  setServerStats: (stats: ServerStats) => void;
}

export const createServerSlice: StateCreator<
  ServerSlice,
  [],
  [],
  ServerSlice
> = (set) => ({
  // Initial state
  serverStats: {
    online_users: 0,
  },

  // Actions
  setServerStats: (stats: ServerStats) => {
    set({ serverStats: stats });
  },
});
