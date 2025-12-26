import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CtaSection() {
  const navigate = useNavigate();

  return (
    <section>
      <Button
        className="w-full"
        variant="terminal"
        size="cta"
        onClick={() => navigate("/editor")}
      >
        + START COMPOSING
      </Button>
    </section>
  );
}
