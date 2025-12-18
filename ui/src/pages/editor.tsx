import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import EditorPlaceholder from "@/components/editor/editor-placeholder";
import Header from "@/components/share/header";
import OnlineUser from "@/components/share/online-user";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import EditorToolbar from "@/components/editor/editor-toolbar";

export default function Editor() {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <Header>
        <Button variant="link" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            <span>BACK</span>
          </Link>
        </Button>
        <EditorToolbar />
        <div className="grow" />
        <OnlineUser />
      </Header>
      <ResizablePanelGroup orientation="horizontal" className="">
        <ResizablePanel defaultSize={450} minSize={300} maxSize={500}>
          <EditorPlaceholder />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <EditorPlaceholder />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
