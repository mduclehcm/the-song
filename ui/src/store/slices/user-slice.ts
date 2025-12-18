import type { StateCreator } from "zustand";

export interface UserSlice {
  // State
  userId: string | null;

  // Actions
  setUserId: (userId: string) => void;
  clearUserId: () => void;
}

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (
  set
) => ({
  // Initial state
  userId: null,

  // Actions
  setUserId: (userId: string) => {
    console.log("[Store] Setting user ID:", userId);
    set({ userId });
  },

  clearUserId: () => {
    set({ userId: null });
  },
});
