import { Drum, Guitar, Piano, Radio, Mic, Wind, Music4 } from "lucide-react";
import { useActiveChannel, useSynthesizedActions } from "@/store/store";
import channelData from "@/assets/channel.json";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Channel {
  name: string;
  channel: number;
}

const getIconForChannel = (name: string): LucideIcon => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("drum") || lowerName.includes("percussion")) {
    return Drum;
  }
  if (lowerName.includes("bass")) {
    return Guitar;
  }
  if (lowerName.includes("piano")) {
    return Piano;
  }
  if (lowerName.includes("synth") || lowerName.includes("square")) {
    return Radio;
  }
  if (lowerName.includes("guitar")) {
    return Guitar;
  }
  if (lowerName.includes("string")) {
    return Music4;
  }
  if (lowerName.includes("trumpet")) {
    return Wind;
  }
  if (lowerName.includes("choir")) {
    return Mic;
  }
  if (lowerName.includes("ocarina") || lowerName.includes("flute")) {
    return Wind;
  }

  return Music4;
};

interface ChannelListProps {
  onChannelSelect?: () => void;
}

export default function ChannelList({ onChannelSelect }: ChannelListProps = {}) {
  const activeChannel = useActiveChannel();
  const { setActiveChannel } = useSynthesizedActions();

  const channels: Channel[] = channelData.channels;

  const handleChannelClick = (channelId: number) => {
    setActiveChannel(channelId);
    onChannelSelect?.();
  };

  return (
    <div className="h-full overflow-y-scroll p-4">
      <div className="flex gap-2 flex-col">
        {channels.map((channel, index) => {
          const Icon = getIconForChannel(channel.name);
          return (
            <button
              key={index}
              onClick={() => handleChannelClick(index)}
              className={cn(
                "flex items-center gap-3 p-3 border-2 text-foreground transition-all duration-200",
                "hover:bg-accent/10 hover:border-accent",
                activeChannel === index
                  ? "bg-accent/20 border-accent"
                  : "bg-background border-border"
              )}
            >
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
