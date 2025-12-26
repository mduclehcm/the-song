import { useState, useEffect } from "react";
import ChannelList from "@/components/editor/channel-list";
import EditorToolbar from "@/components/editor/editor-toolbar";
import PianoRollEditor from "@/components/editor/piano-roll";
import Header from "@/components/share/header";
import OnlineUser from "@/components/share/online-user";
import SoundWarningModal from "@/components/share/sound-warning-modal";
import { midiPlayer } from "@/lib/midi-player";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Menu } from "lucide-react";
import { useResponsiveHook } from "@/hooks/useResponsive";

export default function Editor() {
  const isMobile = useResponsiveHook(900);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [showSoundWarning, setShowSoundWarning] = useState(false);

  useEffect(() => {
    setShowSoundWarning(true);
  }, []);

  const handleAudioConfirm = () => {
    // Close modal immediately to avoid double-click issues
    setShowSoundWarning(false);
    midiPlayer.start().then(() => {
      setAudioReady(true);
    });
  };

  const handleAudioCancel = () => {
    // User cancelled - keep showing the warning since audio is required
    // They can't use the editor without audio permission
  };

  return (
    <>
      <SoundWarningModal
        isOpen={showSoundWarning}
        onConfirm={handleAudioConfirm}
        onCancel={handleAudioCancel}
      />
      <div className="h-screen bg-background text-foreground font-mono flex flex-col">
        <Header>
          {isMobile && (
            <Drawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              direction="left"
            >
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="w-[300px]">
                <DrawerTitle hidden>Channel List</DrawerTitle>
                <ChannelList onChannelSelect={() => setDrawerOpen(false)} />
                <DrawerDescription>Select a channel to edit</DrawerDescription>
              </DrawerContent>
            </Drawer>
          )}
          <EditorToolbar />
          <div className="grow" />
          <OnlineUser />
        </Header>
        <ResizablePanelGroup
          orientation="horizontal"
          className="overflow-hidden"
        >
          {!isMobile && (
            <>
              <ResizablePanel defaultSize={300} minSize={250} maxSize={400}>
                <ChannelList />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          <ResizablePanel>
            {audioReady && <PianoRollEditor />}
            {!audioReady && (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading audio...
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}
