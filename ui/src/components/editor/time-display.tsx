import { useEffect, useState } from "react";
import { midiPlayer, SONG_STRUCTURE } from "@/lib/midi-player";
import { SONG_LEN_IN_SECONDS } from "@/config";
import { useBpm } from "@/store/store";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TimeDisplay() {
  const [currentTime, setCurrentTime] = useState(0);
  const bpm = useBpm();

  useEffect(() => {
    let animationFrameId: number;

    const updateTime = () => {
      if (midiPlayer.getIsPlaying()) {
        const currentBeats = midiPlayer.getCurrentTimeInBeats();
        // Convert beats to seconds: (beats / bpm) * 60
        const seconds = (currentBeats / bpm) * 60;
        setCurrentTime(seconds);
      } else {
        setCurrentTime(0);
      }
      animationFrameId = requestAnimationFrame(updateTime);
    };

    animationFrameId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [bpm]);

  const totalTime = SONG_LEN_IN_SECONDS;

  const currentSection = SONG_STRUCTURE.find(
    (segment) =>
      currentTime >= segment.startTime && currentTime < segment.endTime
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 border border-border bg-background font-mono text-sm uppercase">
        <span className="text-foreground font-medium w-24 text-center">
          {currentSection?.section || "---"}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-border bg-background font-mono text-sm">
        <span className="text-foreground font-medium">
          {formatTime(currentTime)}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formatTime(totalTime)}</span>
      </div>
    </div>
  );
}
