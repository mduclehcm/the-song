import EditorHeader from "../components/editor/EditorHeader";
import EditorPlaceholder from "../components/editor/EditorPlaceholder";

export default function Editor() {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <EditorHeader />
      <EditorPlaceholder />
    </div>
  );
}
