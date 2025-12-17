import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

interface TerminalButtonProps {
  onClick: () => void;
}

export default function TerminalButton({
  onClick,
  children,
}: PropsWithChildren<TerminalButtonProps>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-bold bg-transparent border-2 border-accent px-8 py-4 transition-all duration-150",
        "flex items-center justify-center gap-3",
        "relative overflow-hidden",
        "hover:text-accent-foreground"
      )}
    >
      <div
        data-slot="btn-bg"
        className="absolute inset-0 transition-transform duration-200"
      />
      <span className="text-4xl">+</span>
      <span className="text-4xl">{children}</span>
    </button>
  );
}
