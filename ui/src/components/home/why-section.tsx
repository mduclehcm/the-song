import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const reasons: string[] = [
  "to make noise: because the internet isn't loud enough yet.",
  "to prove a point: that humans can cooperate (or at least hit the same notes eventually).",
  "for the chaos: stress-testing my home server :)",
  "the secret reason: it's technically a job interview assignment, but let's just call it \"Art\".",
];

interface WhyReasonProps {
  index: number;
  text: string;
}

const reasonVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
    },
  },
};

function WhyReason({ index, text }: WhyReasonProps) {
  return (
    <motion.div
      // className="flex items-center gap-3 p-3 transition-all duration-200 border border-border bg-card hover:border-accent"
      variants={reasonVariants}
    >
      <Card>
        <CardContent className="flex items-center gap-3">
          <span className="text-primary shrink-0">[{index + 1}]</span>
          <span className="text-xs text-muted-foreground text-balance">
            {text}
          </span>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export default function WhySection() {
  return (
    <div className="border-b w-full border-border pb-6">
      <p className="text-sm text-muted-foreground mb-2">// Why?</p>
      <motion.div
        className="flex flex-col gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {reasons.map((item, idx) => (
          <WhyReason key={idx} index={idx} text={item} />
        ))}
      </motion.div>
    </div>
  );
}
