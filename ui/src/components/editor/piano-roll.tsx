import { EDITOR_CONTROLLER } from "@/lib/piano-roll-renderer";
import { useEffect, useRef } from "react";

export default function PianoRollEditor() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      EDITOR_CONTROLLER.mount(containerRef.current);
      // TODO: find good sound samples for the synth before using it
      // midiPlayer.init();
      // midiPlayer.start();
    }

    return () => {
      EDITOR_CONTROLLER.unmount();
      // midiPlayer.stop();
    };
  }, []);

  return <div className="h-full w-full relative" ref={containerRef}></div>;
}
