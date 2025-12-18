import type { StateCreator } from "zustand";
import { Crdt } from "@/lib/crdt";
import { WS_CLIENT } from "@/lib/websocket";
import type { ServerMessage } from "@/types/server";

export interface SynthesizedSlice {
  // State
  bpm: number;

  // Actions
  incrementBpm: (bpm: number) => void;
  decrementBpm: (bpm: number) => void;
}

export const createSynthesizedSlice: StateCreator<
  SynthesizedSlice,
  [],
  [],
  SynthesizedSlice
> = (set) => {
  let crdt = new Crdt();
  crdt.getBpm().subscribe(() => {
    set({ bpm: crdt.getBpm().value });
  });
  crdt.on("commit", (event) => {
    WS_CLIENT.send(
      JSON.stringify({
        kind: "SynthesizerUpdate",
        data: { data: Array.from(event.data) },
      })
    );
  });

  // Subscribe to message events
  WS_CLIENT.on("message", (event) => {
    if (event.name !== "message") {
      return;
    }
    try {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.kind === "Welcome") {
        crdt.import(message.data.synthesizer_snapshot);
      } else if (message.kind === "SynthesizerUpdate") {
        crdt.import(message.data.data);
      }
    } catch (error) {
      console.error("[Store] Failed to parse server message:", error);
    }
  });

  return {
    // Initial state
    bpm: 0,

    // Actions
    incrementBpm: (bpm: number) => {
      crdt.incrementBpm(bpm);
    },
    decrementBpm: (bpm: number) => {
      crdt.decrementBpm(bpm);
    },

    importCrdt: (snapshot: Uint8Array) => {
      crdt.import(snapshot);
    },
  };
};
