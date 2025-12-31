'use client';

import { useState, useRef } from 'react';
import { Music, GripHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BackgroundMusic } from '@/types/project';

interface MusicTrackProps {
  music: BackgroundMusic | undefined;
  totalDuration: number; // in seconds
  pixelsPerSecond: number;
  scrollLeft: number;
  onTrimMusic?: (startOffset: number, endOffset: number) => void;
}

export function MusicTrack({
  music,
  totalDuration,
  pixelsPerSecond,
  scrollLeft,
  onTrimMusic,
}: MusicTrackProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!music) {
    return (
      <div className="flex border-b border-white/10">
        {/* Track label */}
        <div className="w-20 flex-shrink-0 px-2 py-1 border-r border-white/10 flex items-center gap-1.5 bg-purple-500/10 h-7">
          <Music className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-medium text-purple-400">Music</span>
        </div>

        {/* Empty track content */}
        <div className="flex-1 h-7 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">No music</span>
        </div>
      </div>
    );
  }

  const startOffset = (music as BackgroundMusic & { startOffset?: number }).startOffset || 0;
  const endOffset = (music as BackgroundMusic & { endOffset?: number }).endOffset || 0;

  const musicDuration = music.duration || totalDuration;
  const effectiveDuration = Math.min(musicDuration - startOffset - endOffset, totalDuration);
  const clipWidth = effectiveDuration * pixelsPerSecond;
  const clipLeft = startOffset * pixelsPerSecond;

  const handleMouseDown = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(handle);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!trackRef.current || !onTrimMusic) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left + scrollLeft;
      const time = x / pixelsPerSecond;

      if (handle === 'start') {
        const newStartOffset = Math.max(0, Math.min(time, musicDuration - endOffset - 1));
        onTrimMusic(newStartOffset, endOffset);
      } else {
        const newEndOffset = Math.max(0, Math.min(musicDuration - startOffset - time, musicDuration - startOffset - 1));
        onTrimMusic(startOffset, newEndOffset);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex border-b border-white/10">
      {/* Track label */}
      <div className="w-20 flex-shrink-0 px-2 py-1 border-r border-white/10 flex items-center gap-1.5 bg-purple-500/10 h-7">
        <Music className="w-3 h-3 text-purple-400" />
        <span className="text-[10px] font-medium text-purple-400">Music</span>
      </div>

      {/* Track content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          ref={trackRef}
          className="relative h-7 py-0.5"
          style={{ width: totalDuration * pixelsPerSecond }}
        >
          <motion.div
            className="absolute top-0.5 bottom-0.5 rounded bg-purple-500/40 border border-purple-500/50 cursor-move"
            style={{
              left: clipLeft,
              width: clipWidth,
            }}
            whileHover={{ backgroundColor: 'rgba(168, 85, 247, 0.5)' }}
          >
            {/* Music title */}
            <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
              <span className="text-[9px] text-white/80 truncate">
                {music.title || 'Music'}
              </span>
            </div>

            {/* Left trim handle */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center hover:bg-purple-400/50 rounded-l ${
                isDragging === 'start' ? 'bg-purple-400/50' : ''
              }`}
              onMouseDown={(e) => handleMouseDown(e, 'start')}
            >
              <GripHorizontal className="w-2 h-2.5 text-white/50 rotate-90" />
            </div>

            {/* Right trim handle */}
            <div
              className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center hover:bg-purple-400/50 rounded-r ${
                isDragging === 'end' ? 'bg-purple-400/50' : ''
              }`}
              onMouseDown={(e) => handleMouseDown(e, 'end')}
            >
              <GripHorizontal className="w-2 h-2.5 text-white/50 rotate-90" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
