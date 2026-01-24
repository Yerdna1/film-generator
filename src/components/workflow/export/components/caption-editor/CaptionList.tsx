import { motion } from 'framer-motion';
import { Type, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Caption } from '@/types/project';

interface CaptionListProps {
  captions: Caption[];
  onEditCaption: (caption: Caption) => void;
  onDeleteCaption: (captionId: string) => void;
  compact?: boolean;
}

export function CaptionList({
  captions,
  onEditCaption,
  onDeleteCaption,
  compact = false,
}: CaptionListProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  if (captions.length === 0) {
    return compact ? (
      <p className="text-[10px] text-muted-foreground text-center py-2">
        No captions
      </p>
    ) : null;
  }

  return (
    <div
      className={cn(
        'space-y-1',
        compact ? 'max-h-32 overflow-y-auto' : 'space-y-2'
      )}
    >
      {captions.map((caption) => (
        <motion.div
          key={caption.id}
          initial={compact ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 group',
            compact ? 'gap-1.5 p-1.5 text-[10px]' : 'gap-2 p-2 lg'
          )}
        >
          <div className="flex-1 min-w-0">
            <p className={cn('truncate', compact ? 'text-[10px]' : 'text-sm')}>
              {caption.text || '(empty)'}
            </p>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
              </p>
            )}
          </div>
          {!compact && (
            <Badge
              variant="outline"
              className="text-[10px] border-yellow-500/30 text-yellow-400"
            >
              {caption.animation}
            </Badge>
          )}
          <div
            className={cn(
              'flex gap-1',
              compact ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(compact ? 'h-5 w-5' : 'h-7 w-7')}
              onClick={() => onEditCaption(caption)}
            >
              <Type className={cn(compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(compact ? 'h-5 w-5' : 'h-7 w-7', 'hover:text-red-400')}
              onClick={() => onDeleteCaption(caption.id)}
            >
              <Trash2 className={cn(compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

import { cn } from '@/lib/utils';
