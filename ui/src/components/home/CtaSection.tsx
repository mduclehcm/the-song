import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import SoundWarningModal from "./SoundWarningModal";

export default function CtaSection() {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  const handleButtonClick = () => {
    setShowWarning(true);
  };

  const handleConfirm = () => {
    navigate("/editor");
  };

  const handleCancel = () => {
    setShowWarning(false);
  };

  return (
    <section>
      <Button
        className="w-full"
        variant="terminal"
        size="cta"
        onClick={handleButtonClick}
      >
        + START COMPOSING
      </Button>
      <SoundWarningModal
        isOpen={showWarning}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </section>
  );
}
