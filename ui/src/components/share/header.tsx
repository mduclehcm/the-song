import type { PropsWithChildren } from "react";

export default function Header({ children }: PropsWithChildren) {
  return (
    <header className="border-b border-border z-10 bg-background h-14 flex items-center justify-between px-6">
      {children}
    </header>
  );
}
