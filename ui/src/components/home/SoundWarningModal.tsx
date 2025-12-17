import { Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SoundWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SoundWarningModal({
  isOpen,
  onConfirm,
  onCancel,
}: SoundWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/90"
        className="max-w-md p-8"
        style={{
          background: "#0c0c0c",
          border: "1px solid #2a2a2a",
        }}
        onInteractOutside={onCancel}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 flex items-center justify-center border border-border">
            <Volume2 className="w-8 h-8 text-foreground" />
          </div>
        </div>

        {/* Content */}
        <DialogTitle>// SOUND WARNING</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          The MIDI realtime player will produce{" "}
          <span className="font-bold">audio output</span>. Please adjust your
          volume to a comfortable level before proceeding.
        </DialogDescription>

        {/* Tip */}
        <Card>
          <CardContent className="text-muted-foreground text-sm">
            Start with low volume and increase gradually.
          </CardContent>
        </Card>

        {/* Actions */}
        <DialogFooter className="flex gap-3 sm:flex-row">
          <Button
            className="flex-1"
            onClick={onCancel}
            variant="secondary"
            size="lg"
          >
            CANCEL
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            variant="default"
            size="lg"
          >
            I'M READY
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
