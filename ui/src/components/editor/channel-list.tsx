import type { LucideIcon } from "lucide-react";
import {
  Drum,
  Guitar,
  Mic,
  Music4,
  Piano,
  Radio,
  Settings,
  Wind,
} from "lucide-react";
import { useState } from "react";

import channelData from "@/assets/channel.json";
import { cn } from "@/lib/utils";
import {
  useActiveChannel,
  useSynthesizedActions,
  useTrackConfigs,
} from "@/store/store";
import { Button } from "@/components/ui/button";

import ChannelConfigDialog from "./channel-config-dialog";

interface Channel {
  id: number;
  name: string;
  channel: number;
}

const channelIconMap: Record<number, LucideIcon> = {
  0: Piano, // Acoustic Piano
  1: Guitar, // Acoustic Guitar
  2: Wind, // Trumpet
  3: Drum, // Acoustic Drum Kit
  4: Drum, // Electric Drum Kit
  5: Drum, // FX Percussion
  6: Guitar, // Electric Bass
  7: Guitar, // Synth Bass
  8: Piano, // Electric Piano
  9: Radio, // Polysynth
  10: Radio, // Square
  11: Music4, // String Ensemble
  12: Mic, // Choir
  13: Wind, // Ocarina
  14: Mic, // Choir Aahs
  15: Wind, // Flute
};

const getIconForChannel = (id: number): LucideIcon => {
  return channelIconMap[id] || Music4;
};

interface ChannelListProps {
  onChannelSelect?: () => void;
}

export default function ChannelList({
  onChannelSelect,
}: ChannelListProps = {}) {
  const activeChannel = useActiveChannel();
  const { setActiveChannel } = useSynthesizedActions();
  const trackConfigs = useTrackConfigs();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState<
    number | null
  >(null);

  const channels: Channel[] = channelData.channels;

  const handleChannelClick = (channelId: number) => {
    setActiveChannel(channelId);
    onChannelSelect?.();
  };

  const handleConfigClick = (e: React.MouseEvent, channelIndex: number) => {
    e.stopPropagation();
    setSelectedChannelIndex(channelIndex);
    setConfigDialogOpen(true);
  };

  return (
    <>
      <div className="h-full overflow-y-scroll p-4">
        <div className="flex gap-2 flex-col">
          {channels.map((channel, index) => {
            const Icon = getIconForChannel(channel.id);
            const accentColor = trackConfigs[index]?.accentColor || "#00ff88";

            return (
              <div
                key={index}
                style={{ "--accent": accentColor } as React.CSSProperties}
                className="group"
              >
                <Button
                  variant="outline"
                  onClick={() => handleChannelClick(index)}
                  className={cn(
                    "w-full h-auto flex items-center justify-start gap-3 p-3 border-2 text-foreground transition-all duration-200 relative overflow-hidden",
                    "hover:bg-accent/10 hover:border-accent",
                    activeChannel === index
                      ? "bg-accent/20 border-accent"
                      : "bg-background border-border"
                  )}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                  <Icon
                    className={cn(
                      "w-5 h-5 shrink-0",
                      activeChannel === index
                        ? "text-accent"
                        : "text-muted-foreground"
                    )}
                  />
                  <div className="flex flex-col items-start flex-1">
                    <span className="text-sm font-medium">{channel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      MIDI Channel {channel.channel}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => handleConfigClick(e, index)}
                    className={cn(
                      "transition-all duration-200",
                      "hover:bg-accent/20 hover:text-accent",
                      "text-muted-foreground",
                      "opacity-0 group-hover:opacity-100"
                    )}
                    title="Channel settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedChannelIndex !== null && (
        <ChannelConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          channelIndex={selectedChannelIndex}
          channel={channels[selectedChannelIndex]}
          currentAccentColor={
            trackConfigs[selectedChannelIndex]?.accentColor || "#00ff88"
          }
        />
      )}
    </>
  );
}
