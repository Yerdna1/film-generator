'use client';

import { useState, useRef } from 'react';
import { Subtitles, GripHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Scene, Caption } from '@/types/project';

interface CaptionTrackProps {
  scenes: Scene[];
  pixelsPerScene: number;
  pixelsPerSecond: number;
  scrollLeft: number;
  selectedCaptionId: string | null;
  onSelectCaption: (captionId: string, sceneId: string) => void;
  onResizeCaption?: (captionId: string, sceneId: string, startTime: number, endTime: number) => void;
}

const SCENE_DURATION = 6; // seconds

export function CaptionTrack({
  scenes,
  pixelsPerScene,
  pixelsPerSecond,
  scrollLeft,
  selectedCaptionId,
  onSelectCaption,
  onResizeCaption,
}: CaptionTrackProps) {
  const [resizing, setResizing] = useState<{ captionId: string; sceneId: string; handle: 'start' | 'end' } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Collect all captions with their scene info
  const allCaptions: Array<{
    caption: Caption;
    sceneId: string;
    sceneIndex: number;
    absoluteStart: number;
  }> = [];

  scenes.forEach((scene, sceneIndex) => {
    if (scene.captions) {
      scene.captions.forEach((caption) => {
        allCaptions.push({
          caption,
          sceneId: scene.id,
          sceneIndex,
          absoluteStart: sceneIndex * SCENE_DURATION + caption.startTime,
        });
      });
    }
  });

  const handleMouseDown = (
    e: React.MouseEvent,
    caption: Caption,
    sceneId: string,
    sceneIndex: number,
    handle: 'start' | 'end'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ captionId: caption.id, sceneId, handle });

    const sceneStartPixels = sceneIndex * pixelsPerScene;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!trackRef.current || !onResizeCaption) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left + scrollLeft;
      const timeInScene = (x - sceneStartPixels) / pixelsPerSecond;

      if (handle === 'start') {
        const newStart = Math.max(0, Math.min(timeInScene, caption.endTime - 0.5));
        onResizeCaption(caption.id, sceneId, newStart, caption.endTime);
      } else {
        const newEnd = Math.max(caption.startTime + 0.5, Math.min(timeInScene, SCENE_DURATION));
        onResizeCaption(caption.id, sceneId, caption.startTime, newEnd);
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const totalWidth = scenes.length * pixelsPerScene;

  return (
    <div className="flex border-b border-white/10">
      {/* Track label */}
      <div className="w-20 flex-shrink-0 px-2 py-1 border-r border-white/10 flex items-center gap-1.5 bg-yellow-500/10 h-7">
        <Subtitles className="w-3 h-3 text-yellow-400" />
        <span className="text-[10px] font-medium text-yellow-400">Captions</span>
      </div>

      {/* Track content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          ref={trackRef}
          className="relative h-7 py-0.5"
          style={{ width: totalWidth }}
        >
          {/* Scene separators */}
          {scenes.map((_, index) => (
            <div
              key={`sep-${index}`}
              className="absolute top-0 bottom-0 w-px bg-white/10"
              style={{ left: (index + 1) * pixelsPerScene }}
            />
          ))}

          {/* Caption blocks */}
          {allCaptions.map(({ caption, sceneId, sceneIndex }) => {
            const sceneStartPixels = sceneIndex * pixelsPerScene;
            const captionLeft = sceneStartPixels + caption.startTime * pixelsPerSecond;
            const captionWidth = (caption.endTime - caption.startTime) * pixelsPerSecond;
            const isSelected = selectedCaptionId === caption.id;
            const isResizing = resizing?.captionId === caption.id;

            return (
              <motion.div
                key={caption.id}
                className={`absolute top-0.5 bottom-0.5 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-yellow-500/60 border border-yellow-400 ring-1 ring-yellow-400/30'
                    : 'bg-yellow-500/30 border border-yellow-500/40 hover:bg-yellow-500/40'
                }`}
                style={{
                  left: captionLeft,
                  width: Math.max(captionWidth, 16),
                }}
                onClick={() => onSelectCaption(caption.id, sceneId)}
                whileHover={{ scale: isResizing ? 1 : 1.01 }}
              >
                {/* Caption text */}
                <div className="absolute inset-0 flex items-center px-1 overflow-hidden">
                  <span className="text-[8px] text-white truncate">
                    {caption.text}
                  </span>
                </div>

                {/* Left resize handle */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize rounded-l hover:bg-yellow-400/50 ${
                    isResizing && resizing.handle === 'start' ? 'bg-yellow-400/50' : ''
                  }`}
                  onMouseDown={(e) => handleMouseDown(e, caption, sceneId, sceneIndex, 'start')}
                />

                {/* Right resize handle */}
                <div
                  className={`absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize rounded-r hover:bg-yellow-400/50 ${
                    isResizing && resizing.handle === 'end' ? 'bg-yellow-400/50' : ''
                  }`}
                  onMouseDown={(e) => handleMouseDown(e, caption, sceneId, sceneIndex, 'end')}
                />
              </motion.div>
            );
          })}

          {/* Empty state per scene if no captions - simplified */}
          {scenes.map((scene, index) => {
            if (scene.captions && scene.captions.length > 0) return null;
            return (
              <div
                key={`empty-${scene.id}`}
                className="absolute top-0.5 bottom-0.5 bg-white/5 rounded"
                style={{
                  left: index * pixelsPerScene + 2,
                  width: pixelsPerScene - 4,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
