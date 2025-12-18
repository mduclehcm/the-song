import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  createWebSocketSlice,
  type WebSocketSlice,
} from "./slices/websocket-slice";
import { createUserSlice, type UserSlice } from "./slices/user-slice";
import { createServerSlice, type ServerSlice } from "./slices/server-slice";
import { createMouseSlice, type MouseSlice } from "./slices/mouse-slice";
import {
  createSynthesizedSlice,
  type SynthesizedSlice,
} from "./slices/synthesized-slice";

type StoreState = WebSocketSlice &
  UserSlice &
  ServerSlice &
  MouseSlice &
  SynthesizedSlice;

export const useStore = create<StoreState>((...a) => ({
  ...createWebSocketSlice(...a),
  ...createUserSlice(...a),
  ...createServerSlice(...a),
  ...createMouseSlice(...a),
  ...createSynthesizedSlice(...a),
}));

// Export individual slice hooks for better tree-shaking and performance
export const useWebSocketStatus = () => useStore((state) => state.status);
export const useWebSocketActions = () =>
  useStore(
    useShallow((state) => ({
      init: state.init,
      disconnect: state.disconnect,
      send: state.send,
    }))
  );

export const useUserId = () => useStore((state) => state.userId);
export const useUserActions = () =>
  useStore(
    useShallow((state) => ({
      setUserId: state.setUserId,
      clearUserId: state.clearUserId,
    }))
  );

export const useServerStats = () => useStore((state) => state.serverStats);
export const useServerActions = () =>
  useStore(
    useShallow((state) => ({
      setServerStats: state.setServerStats,
    }))
  );

export const useMousePositions = () =>
  useStore((state) => state.mousePositions);
export const useMouseActions = () =>
  useStore(
    useShallow((state) => ({
      setMousePositions: state.setMousePositions,
      updateMousePositions: state.updateMousePositions,
      sendMouseUpdate: state.sendMouseUpdate,
    }))
  );

export const useBpm = () => useStore((state) => state.bpm);
export const useSynthesizedActions = () =>
  useStore(
    useShallow((state) => ({
      incrementBpm: state.incrementBpm,
      decrementBpm: state.decrementBpm,
    }))
  );
