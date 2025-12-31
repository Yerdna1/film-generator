'use client';

import { Mic } from 'lucide-react';
import type { Scene } from '@/types/project';

interface AudioTrackProps {
  scenes: Scene[];
  pixelsPerScene: number;
  scrollLeft: number;
}

export function AudioTrack({
  scenes,
  pixelsPerScene,
  scrollLeft,
}: AudioTrackProps) {
  return (
    <div className="flex border-b border-white/10">
      {/* Track label */}
      <div className="w-20 flex-shrink-0 px-2 py-1 border-r border-white/10 flex items-center gap-1.5 bg-violet-500/10 h-7">
        <Mic className="w-3 h-3 text-violet-400" />
        <span className="text-[10px] font-medium text-violet-400">Audio</span>
      </div>

      {/* Track content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="flex gap-1 h-7 py-0.5 px-1"
          style={{ width: scenes.length * pixelsPerScene }}
        >
          {scenes.map((scene) => {
            const clipWidth = pixelsPerScene - 4;
            const hasDialogue = scene.dialogue && scene.dialogue.length > 0;

            return (
              <div
                key={scene.id}
                className="flex-shrink-0 h-full rounded overflow-hidden flex items-center gap-0.5"
                style={{ width: clipWidth }}
              >
                {hasDialogue ? (
                  scene.dialogue.map((line, lineIdx) => (
                    <div
                      key={lineIdx}
                      className={`h-full flex-1 rounded transition-colors ${
                        line.audioUrl
                          ? 'bg-violet-500/50 hover:bg-violet-500/70'
                          : 'bg-violet-500/20 border border-dashed border-violet-500/30'
                      }`}
                      title={`${line.characterName}: ${line.text}`}
                    />
                  ))
                ) : (
                  <div className="w-full h-full bg-white/5 rounded" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
