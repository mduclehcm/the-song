import { LoroCounter, LoroDoc } from "loro-crdt";

import { THROTTLE_COMMIT_DELAY } from "@/config";
import { EventEmitter } from "@/lib/event";
import { throttle } from "@/lib/utils";

export type CommitEvent = {
  name: "commit";
  data: Uint8Array;
};
export type CrdtEvent = CommitEvent;

export class Crdt extends EventEmitter<CommitEvent> {
  private doc: LoroDoc;
  private bpm: LoroCounter;

  constructor() {
    super();
    this.doc = new LoroDoc();
    this.bpm = this.doc.getCounter("bpm");
    this.commitThrottled = throttle(
      this.commitThrottled.bind(this),
      THROTTLE_COMMIT_DELAY
    );
  }

  public import(snapshot: Uint8Array) {
    this.doc.import(snapshot);
  }

  public getBpm() {
    return this.bpm;
  }

  public incrementBpm(value: number) {
    if (value < 0) {
      throw new Error("Value must be positive");
    }
    if (value > 10) {
      throw new Error("Value must be less than 10");
    }
    this.bpm.increment(value);
    this.commit();
  }

  public decrementBpm(value: number) {
    if (value < 0) {
      throw new Error("Value must be positive");
    }
    if (value > 10) {
      throw new Error("Value must be less than 10");
    }
    this.bpm.decrement(value);
    this.commit();
  }

  private commit() {
    this.doc.commit();
    this.commitThrottled();
  }

  private commitThrottled() {
    this.emit({ name: "commit", data: this.doc.export({ mode: "update" }) });
  }
}
