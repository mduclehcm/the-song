import type { StateCreator } from "zustand";
import { Crdt, type TrackConfig } from "@/lib/crdt";
import { WS_CLIENT } from "@/lib/websocket";
import type { ServerMessage } from "@/types/server";
import type { NoteData } from "@/lib/piano-roll-renderer/types";
import { EDITOR_CONTROLLER } from "@/lib/piano-roll-renderer";

export interface SynthesizedSlice {
  // State
  bpm: number;
  activeChannel: number;
  trackConfigs: TrackConfig[];

  crdt: Crdt;

  // Actions
  incrementBpm: (bpm: number) => void;
  decrementBpm: (bpm: number) => void;
  setActiveChannel: (channelId: number) => void;
  setTrackConfig: (trackIndex: number, config: Partial<TrackConfig>) => void;

  // Notes Actions
  updateNote: (
    noteId: string,
    updates: Partial<
      Omit<NoteData, "id" | "createdAt" | "createdBy" | "trackIndex">
    >
  ) => void;
  deleteNote: (noteId: string) => void;
}

export const crdt = new Crdt();

export const createSynthesizedSlice: StateCreator<
  SynthesizedSlice,
  [],
  [],
  SynthesizedSlice
> = (set) => {
  // Subscribe to BPM changes
  crdt.subscribeBpm((bpm) => {
    set({ bpm });
  });

  // Subscribe to any CRDT changes to update track configs
  crdt.subscribeChange(() => {
    const trackConfigs = crdt.getAllTrackConfigs();
    set({ trackConfigs });
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
    activeChannel: 0,
    trackConfigs: crdt.getAllTrackConfigs(),

    // CRDT instance for direct access
    crdt,

    // BPM Actions
    incrementBpm: (bpm: number) => {
      crdt.incrementBpm(bpm);
    },
    decrementBpm: (bpm: number) => {
      crdt.decrementBpm(bpm);
    },
    setActiveChannel: (channelId: number) => {
      set({ activeChannel: channelId });
      EDITOR_CONTROLLER.setActiveTrackIndex(channelId);
    },
    setTrackConfig: (trackIndex: number, config: Partial<TrackConfig>) => {
      crdt.setTrackConfig(trackIndex, config);
    },

    // Notes Actions

    updateNote: (noteId, updates) => {
      crdt.updateNote(noteId, updates);
    },

    deleteNote: (noteId) => {
      crdt.deleteNote(noteId);
    },
  };
};
