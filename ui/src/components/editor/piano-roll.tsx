import { SONG_LEN_IN_SECONDS } from "@/config";
import PianoRollRenderer, { type TrackConfig } from "@/lib/piano-roll-renderer";
import { useStore, useCrdt } from "@/store/store";
import { useEffect, useMemo, useRef, useState } from "react";

export default function PianoRollEditor() {
  const bpm = useStore((state) => state.bpm);
  const crdt = useCrdt();

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PianoRollRenderer | null>(null);

  // Track config (without notes - notes come from CRDT directly)
  const trackConfig: TrackConfig = useMemo(
    () => ({
      length: SONG_LEN_IN_SECONDS,
      timeSignature: [4, 4],
      bpm,
    }),
    [bpm]
  );

  useEffect(() => {
    setTimeout(() => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        setWidth(width);
        setHeight(height);
      }
    }, 0);
  }, [containerRef]);

  // Create renderer once when canvas and dimensions are ready
  // Note: crdt/trackConfig/handleNoteClick are intentionally excluded from deps
  // They are set via separate effects to avoid recreating the renderer
  useEffect(() => {
    if (canvasRef.current && width > 0 && height > 0 && !rendererRef.current) {
      // Set canvas resolution for high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      // Create new renderer instance
      rendererRef.current = new PianoRollRenderer(canvasRef.current);
      rendererRef.current.setCrdt(crdt); // Subscribe directly to CRDT (singleton)
      rendererRef.current.render(trackConfig);
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // Update track config when bpm changes (without recreating renderer)
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(trackConfig);
    }
  }, [trackConfig]);

  return (
    <div className="h-full w-full" ref={containerRef}>
      <canvas width={width} height={height} ref={canvasRef} />
    </div>
  );
}
