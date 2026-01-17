import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidePanelToggleProps {
  onClick: () => void;
}

export function SidePanelToggle({ onClick }: SidePanelToggleProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={onClick}
      className="hidden lg:flex items-center justify-center w-10 h-20 rounded-l-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all group"
    >
      <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </motion.button>
  );
}

export function MobileSidePanelToggle({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full bg-cyan-500 text-white shadow-lg hover:bg-cyan-400 transition-all"
    >
      <ChevronLeft className={`w-5 h-5 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
    </button>
  );
}