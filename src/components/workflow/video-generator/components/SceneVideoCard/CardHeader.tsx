'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadges } from '@/components/shared/card-actions';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CardHeaderProps } from './types';
import { getStatusColor, getStatusIcon } from './utils';

export function CardHeader({
  scene,
  index,
  isLocked,
  hasPendingRegeneration,
  hasPendingDeletion,
  approvedRegeneration,
  isVideoStale: videoStale,
  isSelected,
  status,
  onToggleSelect,
}: CardHeaderProps) {
  const t = useTranslations('steps');

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Scene Number Badge + Status Badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-auto">
        <Badge className="bg-black/60 text-white border-0">
          {t('scenes.sceneLabel')} {scene.number || index + 1}
        </Badge>
        <StatusBadges
          isLocked={isLocked}
          hasPendingRegeneration={hasPendingRegeneration}
          hasPendingDeletion={hasPendingDeletion}
          approvedRegeneration={approvedRegeneration}
          onRegenerationClick={() => {/* Handled by parent */}}
          lockedLabel={t('scenes.status.locked')}
        />
        {videoStale && !isLocked && (
          <Badge className="bg-orange-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 flex items-center gap-0.5" title={t('videos.staleWarning.badge')}>
            <AlertTriangle className="w-2.5 h-2.5" />
            {t('videos.staleWarning.badge')}
          </Badge>
        )}
      </div>

      {/* Status Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-auto">
        {onToggleSelect && scene.imageUrl && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="h-5 w-5 border-2 border-white/50 bg-black/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
          </div>
        )}
        <Badge variant="outline" className={`${getStatusColor(status)} bg-black/60`}>
          {getStatusIcon(status)}
        </Badge>
      </div>
    </div>
  );
}
