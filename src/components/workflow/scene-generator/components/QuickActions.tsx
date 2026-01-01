'use client';

import { useTranslations } from 'next-intl';
import { Copy, RefreshCw, Sparkles, Square, ChevronDown, CheckSquare, XSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCostCompact, getImageCost, type ImageResolution } from '@/lib/services/real-costs';

interface QuickActionsProps {
  totalScenes: number;
  scenesWithImages: number;
  imageResolution: ImageResolution;
  isGeneratingAllImages: boolean;
  onCopyPrompts: () => void;
  onRegenerateAll: () => void;
  onGenerateAllImages: () => void;
  onGenerateBatch?: (batchSize: number) => void;
  onStopGeneration: () => void;
  backgroundJobProgress?: number;
  // Selection props
  selectedCount?: number;
  onSelectAllWithImages?: () => void;
  onClearSelection?: () => void;
  onRegenerateSelected?: () => void;
}

// Batch size options (number of images to generate)
const BATCH_OPTIONS = [5, 10, 25, 50, 100];

export function QuickActions({
  totalScenes,
  scenesWithImages,
  imageResolution,
  isGeneratingAllImages,
  onCopyPrompts,
  onRegenerateAll,
  onGenerateAllImages,
  onGenerateBatch,
  onStopGeneration,
  backgroundJobProgress,
  selectedCount = 0,
  onSelectAllWithImages,
  onClearSelection,
  onRegenerateSelected,
}: QuickActionsProps) {
  const t = useTranslations();
  const remainingImages = totalScenes - scenesWithImages;
  const costPerImage = getImageCost(imageResolution);

  return (
    <div className="space-y-4">
      {/* Selection Controls - Show when scenes have images */}
      {scenesWithImages > 0 && onSelectAllWithImages && onClearSelection && onRegenerateSelected && (
        <div className="flex flex-wrap gap-3 justify-center items-center glass rounded-xl p-3">
          <span className="text-sm text-muted-foreground">Selection:</span>
          <Button
            variant="outline"
            size="sm"
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            onClick={onSelectAllWithImages}
            disabled={isGeneratingAllImages}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Select All ({scenesWithImages})
          </Button>
          {selectedCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5"
                onClick={onClearSelection}
                disabled={isGeneratingAllImages}
              >
                <XSquare className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-0"
                onClick={onRegenerateSelected}
                disabled={isGeneratingAllImages}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Selected ({selectedCount})
                <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
                  ~{formatCostCompact(costPerImage * selectedCount)}
                </Badge>
              </Button>
            </>
          )}
        </div>
      )}

      {/* Main Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        {/* Copy Prompts for Gemini Button */}
        <Button
          variant="outline"
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          disabled={totalScenes === 0}
          onClick={onCopyPrompts}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Prompts for Gemini
          <Badge variant="outline" className="ml-2 border-purple-500/30 text-purple-400 text-[10px] px-1.5 py-0">
            FREE
          </Badge>
        </Button>
        <Button
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          disabled={totalScenes === 0 || isGeneratingAllImages}
          onClick={onRegenerateAll}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('steps.scenes.regenerateAll')}
        </Button>
      {isGeneratingAllImages ? (
        <Button
          className="bg-red-600 hover:bg-red-500 text-white border-0"
          onClick={onStopGeneration}
        >
          <Square className="w-4 h-4 mr-2" />
          {backgroundJobProgress !== undefined
            ? `Processing... ${backgroundJobProgress}%`
            : `Stop (${scenesWithImages}/${totalScenes})`}
        </Button>
      ) : scenesWithImages === totalScenes ? (
        <Button
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
          disabled
        >
          <Sparkles className="w-4 h-4 mr-2" />
          All Images Generated
        </Button>
      ) : (
        <div className="flex gap-2">
          {/* Batch generation dropdown */}
          {onGenerateBatch && remainingImages > 5 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  disabled={totalScenes === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Batch
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-strong border-white/10">
                {BATCH_OPTIONS.filter(size => size <= remainingImages).map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => onGenerateBatch(size)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{size} images</span>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                        ~{formatCostCompact(costPerImage * size)}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Generate all button */}
          <Button
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
            disabled={totalScenes === 0}
            onClick={onGenerateAllImages}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {remainingImages <= 5 ? (
              <>Generate {remainingImages} images</>
            ) : (
              <>Generate All ({remainingImages})</>
            )}
            <Badge variant="outline" className="ml-2 border-white/30 text-white text-[10px] px-1.5 py-0">
              ~{formatCostCompact(costPerImage * remainingImages)}
            </Badge>
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
