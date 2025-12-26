import { EDITOR_CONTROLLER } from "@/lib/piano-roll-renderer";
import { useEffect, useRef } from "react";

export default function PianoRollEditor() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      EDITOR_CONTROLLER.mount(containerRef.current);
    }

    return () => {
      EDITOR_CONTROLLER.unmount();
    };
  }, []);

  return <div className="h-full w-full relative" ref={containerRef}></div>;
}
