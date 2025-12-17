import type { PropsWithChildren } from "react";

export default function TerminalLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden text-foreground">
      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30 z-[-1]"
        style={{
          backgroundImage:
            "linear-gradient(#2a2a2a 1px, transparent 1px), linear-gradient(90deg, #2a2a2a 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {children}
    </div>
  );
}
