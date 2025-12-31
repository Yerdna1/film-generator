'use client';

import { motion } from 'framer-motion';

interface PlayheadProps {
  currentTime: number; // in seconds
  zoom: number; // pixels per second
  height: number; // total height of tracks
  scrollLeft: number;
}

export function Playhead({ currentTime, zoom, height, scrollLeft }: PlayheadProps) {
  const position = currentTime * zoom - scrollLeft;
  const trackLabelsWidth = 80; // w-20 = 80px

  // Don't render if playhead is not visible
  if (position < 0 || position > 2000) return null;

  return (
    <motion.div
      className="absolute top-0 z-50 pointer-events-none"
      style={{ left: position + trackLabelsWidth }}
      initial={false}
      animate={{ left: position + trackLabelsWidth }}
      transition={{ type: 'tween', duration: 0.1 }}
    >
      {/* Playhead handle */}
      <div className="relative">
        <div className="absolute -left-1.5 -top-0.5 w-3 h-2 bg-cyan-500 rounded-t-sm" />
        <div className="absolute -left-px top-1.5 w-0.5 bg-cyan-500" style={{ height }} />
      </div>
    </motion.div>
  );
}
