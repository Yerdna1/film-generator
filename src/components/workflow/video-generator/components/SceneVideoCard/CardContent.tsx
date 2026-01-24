'use client';

import { MessageSquare } from 'lucide-react';
import { CopyButton } from '@/components/shared/CopyButton';
import type { CardContentProps } from './types';

export function CardContent({
  scene,
  isLocked,
  isVideoStale: videoStale,
  buildFullI2VPrompt,
}: CardContentProps) {
  return (
    <div className="p-2 space-y-1.5">
      {/* Title row with copy button */}
      <div className="flex items-center justify-between gap-1">
        <h3 className="font-medium text-sm truncate flex-1">{scene.title}</h3>
        <CopyButton text={buildFullI2VPrompt(scene)} size="icon" className="h-5 w-5 shrink-0" />
      </div>

      {/* Meta info */}
      <p className="text-[10px] text-muted-foreground">
        {scene.duration || 6}s • {scene.cameraShot}
      </p>

      {/* I2V Prompt */}
      <p className="text-[10px] text-muted-foreground/70 truncate" title={scene.imageToVideoPrompt}>
        {scene.imageToVideoPrompt}
      </p>

      {/* Dialogue */}
      {scene.dialogue && scene.dialogue.length > 0 && (
        <div className="flex items-center gap-1 text-[10px]">
          <MessageSquare className="w-3 h-3 text-purple-400 shrink-0" />
          <span className="text-purple-300 truncate">
            {scene.dialogue.map(d => d.characterName).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
