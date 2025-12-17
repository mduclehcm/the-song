import CtaSection from "@/components/home/CtaSection";
import TitleSection from "@/components/home/TitleSection";
import WhySection from "@/components/home/WhySection";
import TerminalLayout from "@/components/layout/TerminalLayout";
import FooterSection from "@/components/home/FooterSection";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Home() {
  return (
    <TerminalLayout>
      <motion.main
        className="z-10 flex flex-col gap-6  max-w-lg mx-auto w-full pt-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <TitleSection />
        </motion.div>
        <motion.div variants={itemVariants}>
          <WhySection />
        </motion.div>
        <motion.div variants={itemVariants}>
          <CtaSection />
        </motion.div>
      </motion.main>
      <div className="grow" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <FooterSection />
      </motion.div>
    </TerminalLayout>
  );
}
