import type { StateCreator } from "zustand";
import { WS_CLIENT } from "@/lib/websocket";
import { Crdt, crdt, type NoteUpdates, type TrackConfig } from "@/lib/crdt";
import { EDITOR_CONTROLLER } from "@/lib/piano-roll-renderer";
import type { ServerMessage } from "@the-song/protocol";

export interface SynthesizedSlice {
  // BPM State
  bpm: number;
  activeChannel: number;
  trackConfigs: TrackConfig[];

  // CRDT instance
  crdt: Crdt;

  // BPM Actions
  incrementBpm: (bpm: number) => void;
  decrementBpm: (bpm: number) => void;

  // Channel Actions
  setActiveChannel: (channelId: number) => void;
  setTrackConfig: (trackIndex: number, config: Partial<TrackConfig>) => void;

  // Notes Actions
  updateNote: (noteId: string, updates: NoteUpdates) => void;
  deleteNote: (noteId: string) => void;
}

// Re-export crdt for backwards compatibility
export { crdt };

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

  // Send CRDT updates via binary protobuf
  crdt.on("commit", (event) => {
    WS_CLIENT.sendSynthesizerUpdate(event.data);
  });

  // Subscribe to message events (binary protobuf messages)
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
        crdt.import(payload.value.synthesizerSnapshot);
        break;
      case "synthesizerUpdate":
        crdt.import(payload.value.data);
        break;
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
