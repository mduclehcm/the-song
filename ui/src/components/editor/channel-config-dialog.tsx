import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_ACCENT_COLORS } from "@/lib/crdt";
import { useSynthesizedActions } from "@/store/store";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Channel {
  name: string;
  channel: number;
}

interface ChannelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelIndex: number;
  channel: Channel;
  currentAccentColor: string;
}

export default function ChannelConfigDialog({
  open,
  onOpenChange,
  channelIndex,
  channel,
  currentAccentColor,
}: ChannelConfigDialogProps) {
  const { setTrackConfig } = useSynthesizedActions();
  const [selectedColor, setSelectedColor] = useState(currentAccentColor);

  // Update selected color when the current accent color changes or dialog opens with a new channel
  useEffect(() => {
    setSelectedColor(currentAccentColor);
  }, [currentAccentColor, channelIndex]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setTrackConfig(channelIndex, { accentColor: color });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Channel Configuration</DialogTitle>
          <DialogDescription>
            Configure settings for {channel.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Channel Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              Channel Information
            </h3>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{channel.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">MIDI Channel:</span>
                <span className="font-medium">{channel.channel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Track Index:</span>
                <span className="font-medium">{channelIndex}</span>
              </div>
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Accent Color
            </h3>
            <div className="grid grid-cols-8 gap-2">
              {DEFAULT_ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    "relative h-10 w-10 rounded-md border-2 transition-all hover:scale-110",
                    selectedColor === color
                      ? "border-foreground ring-2 ring-foreground/20"
                      : "border-border hover:border-foreground/50"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {selectedColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedColor}
            </p>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Preview</h3>
            <div
              className="rounded-lg border-2 p-4 transition-colors"
              style={{
                borderColor: selectedColor,
                backgroundColor: `${selectedColor}20`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full"
                  style={{ backgroundColor: selectedColor }}
                />
                <div>
                  <p className="font-medium text-foreground">{channel.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Notes will appear in this color
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
