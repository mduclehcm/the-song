import { BpmControl } from "./bpm-control";
import { TimeDisplay } from "./time-display";

export default function EditorToolbar() {
  return (
    <div className="flex items-center gap-2">
      <BpmControl />
      <TimeDisplay />
    </div>
  );
}
