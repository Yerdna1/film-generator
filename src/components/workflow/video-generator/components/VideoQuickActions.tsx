'use client';

import { useTranslations } from 'next-intl';
import { Zap, Square, RefreshCw, Cloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectionQuickActions } from '@/components/shared/SelectionQuickActions';
import { ACTION_COSTS, formatCostCompact } from '@/lib/services/real-costs';
import { Progress } from '@/components/ui/progress';

interface VideoQuickActionsProps {
  scenesWithImages: number;
  scenesWithVideos: number;
  scenesNeedingGeneration: number;
  isGeneratingAll: boolean;
  onGenerateAll: () => void;
  onStopGeneration: () => void;
  // Selection props
  selectedCount?: number;
  onSelectAll?: () => void;
  onSelectAllWithVideos?: () => void;
  onSelectAllWithoutVideos?: () => void;
  onClearSelection?: () => void;
  onGenerateSelected?: () => void;
  onRequestRegeneration?: () => void;
  // Background generation props
  backgroundJobId?: string | null;
  backgroundJobStatus?: {
    status: string;
    progress: number;
    totalVideos: number;
    completedVideos: number;
    failedVideos: number;
  } | null;
  onStartBackgroundGeneration?: (limit?: number) => void;
  onCancelBackgroundJob?: () => void;
}

export function VideoQuickActions({
  scenesWithImages,
  scenesWithVideos,
  scenesNeedingGeneration,
  isGeneratingAll,
  onGenerateAll,
  onStopGeneration,
  selectedCount = 0,
  onSelectAll,
  onSelectAllWithVideos,
  onSelectAllWithoutVideos,
  onClearSelection,
  onGenerateSelected,
  onRequestRegeneration,
  backgroundJobId,
  backgroundJobStatus,
  onStartBackgroundGeneration,
  onCancelBackgroundJob,
}: VideoQuickActionsProps) {
  const t = useTranslations();

  // Build selection options for the shared component
  const selectionOptions = [];
  if (onSelectAll) {
    selectionOptions.push({
      label: 'Select All',
      count: scenesWithImages,
      onClick: onSelectAll,
      variant: 'orange' as const,
    });
  }
  if (scenesWithVideos > 0 && onSelectAllWithVideos) {
    selectionOptions.push({
      label: 'With Videos',
      count: scenesWithVideos,
      onClick: onSelectAllWithVideos,
      variant: 'emerald' as const,
    });
  }
  if (scenesNeedingGeneration > 0 && onSelectAllWithoutVideos) {
    selectionOptions.push({
      label: 'Without Videos',
      count: scenesNeedingGeneration,
      onClick: onSelectAllWithoutVideos,
      variant: 'amber' as const,
    });
  }

  return (
    <div className="space-y-4">
      {/* Selection Controls - using shared component */}
      {scenesWithImages > 0 && onSelectAll && onClearSelection && (
        <SelectionQuickActions
          selectedCount={selectedCount}
          isDisabled={isGeneratingAll}
          selectionOptions={selectionOptions}
          onClearSelection={onClearSelection}
          primaryAction={onGenerateSelected ? {
            label: 'Generate Selected',
            onClick: onGenerateSelected,
            costPerItem: ACTION_COSTS.video.grok,
            icon: <RefreshCw className="w-4 h-4 mr-2" />,
          } : undefined}
          onRequestApproval={onRequestRegeneration}
        />
      )}

      {/* Main Actions */}
      <div className="flex flex-wrap gap-4 justify-center items-center">
        {isGeneratingAll ? (
          <Button
            className="bg-red-600 hover:bg-red-500 text-white border-0"
            onClick={onStopGeneration}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        ) : (
          <Button
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-0"
            disabled={scenesWithImages === 0}
            onClick={onGenerateAll}
          >
            <Zap className="w-4 h-4 mr-2" />
            {t('steps.videos.generateAll')}
            <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
              {scenesNeedingGeneration > 0
                ? formatCostCompact(scenesNeedingGeneration * ACTION_COSTS.video.grok)
                : `${formatCostCompact(ACTION_COSTS.video.grok)}/ea`}
            </Badge>
          </Button>
        )}

        {/* Background Generation */}
        {onStartBackgroundGeneration && !isGeneratingAll && scenesNeedingGeneration > 0 && (
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            disabled={backgroundJobId !== null}
            onClick={() => onStartBackgroundGeneration()}
          >
            <Cloud className="w-4 h-4 mr-2" />
            Generate in Background
          </Button>
        )}
      </div>

      {/* Background Job Status */}
      {backgroundJobId && backgroundJobStatus && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">
                Background Generation: {backgroundJobStatus.completedVideos}/{backgroundJobStatus.totalVideos} videos
              </span>
            </div>
            {onCancelBackgroundJob && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelBackgroundJob}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Progress value={backgroundJobStatus.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Status: {backgroundJobStatus.status}</span>
            {backgroundJobStatus.failedVideos > 0 && (
              <span className="text-red-400">
                {backgroundJobStatus.failedVideos} failed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
