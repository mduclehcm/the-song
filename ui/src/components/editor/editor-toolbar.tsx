import { Button } from "@/components/ui/button";
import { useSynthesizedActions, useBpm } from "@/store/store";
import { MinusIcon, PlusIcon } from "lucide-react";

export default function EditorToolbar() {
  const bpm = useBpm();
  const incrementBpm = useSynthesizedActions().incrementBpm;
  const decrementBpm = useSynthesizedActions().decrementBpm;
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => decrementBpm(1)}>
        <MinusIcon className="size-4" />
      </Button>
      <span className="text-sm">{bpm}</span>
      <Button variant="outline" onClick={() => incrementBpm(1)}>
        <PlusIcon className="size-4" />
      </Button>
    </div>
  );
}
