export default function EditorPlaceholder() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-6">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-8 border border-zinc-800 flex items-center justify-center">
          <span className="text-4xl">🎹</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
          MIDI EDITOR
        </h1>

        <p className="text-zinc-600 max-w-md mx-auto mb-8 text-sm">
          The editor workspace is coming soon. This is where you'll compose
          and play your music in real-time.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-500 text-xs tracking-wide">
          <span className="w-2 h-2 bg-amber-500 animate-pulse" />
          UNDER DEVELOPMENT
        </div>
      </div>
    </main>
  );
}

