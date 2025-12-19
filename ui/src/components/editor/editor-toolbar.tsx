import { BpmControl } from "./bpm-control";

export default function EditorToolbar() {
  return (
    <div className="flex items-center gap-2">
      <BpmControl />
    </div>
  );
}
