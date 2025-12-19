import { useEffect, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useSynthesizedActions, useBpm } from "@/store/store";
import { cn } from "@/lib/utils";

export function BpmControl() {
  const bpm = useBpm();
  const incrementBpm = useSynthesizedActions().incrementBpm;
  const decrementBpm = useSynthesizedActions().decrementBpm;
  const [isFlashing, setIsFlashing] = useState(false);
  const prevBpmRef = useRef(bpm);

  useEffect(() => {
    if (prevBpmRef.current !== bpm) {
      setIsFlashing(true);
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 200);
      prevBpmRef.current = bpm;
      return () => clearTimeout(timer);
    }
  }, [bpm]);

  return (
    <ButtonGroup>
      <Button variant="outline" onClick={() => decrementBpm(5)}>
        <ChevronsLeftIcon className="size-4" />
      </Button>
      <Button variant="outline" onClick={() => decrementBpm(1)}>
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        variant="outline"
        className={cn(
          "transition-colors duration-300",
          isFlashing && "bg-accent text-accent-foreground "
        )}
      >
        BPM:{bpm}
      </Button>
      <Button variant="outline" onClick={() => incrementBpm(1)}>
        <ChevronRightIcon className="size-4" />
      </Button>
      <Button variant="outline" onClick={() => incrementBpm(5)}>
        <ChevronsRightIcon className="size-4" />
      </Button>
    </ButtonGroup>
  );
}
