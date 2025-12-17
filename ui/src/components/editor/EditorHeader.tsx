import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function EditorHeader() {
  return (
    <header className="border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <Button variant="link" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            <span>BACK</span>
          </Link>
        </Button>

        <span className="text-lg font-bold tracking-tight">THE SONG.</span>

        <div className="w-16" />
      </div>
    </header>
  );
}
