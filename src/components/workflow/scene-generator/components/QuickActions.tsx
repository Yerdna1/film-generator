'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, RefreshCw, Sparkles, Square, ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SelectionQuickActions } from '@/components/shared/SelectionQuickActions';
import { formatCostCompact, getImageCost, type ImageResolution } from '@/lib/services/real-costs';
import type { Scene } from '@/types/project';
import { toast } from 'sonner';

interface QuickActionsProps {
  totalScenes: number;
  scenesWithImages: number;
  imageResolution: ImageResolution;
  isGeneratingAllImages: boolean;
  onCopyPrompts: () => void;
  onGenerateAllImages: () => void;
  onGenerateBatch?: (batchSize: number) => void;
  onStopGeneration: () => void;
  backgroundJobProgress?: number;
  // Selection props
  selectedCount?: number;
  onSelectAll?: () => void;
  onSelectAllWithImages?: () => void;
  onClearSelection?: () => void;
  onRegenerateSelected?: () => void;
  onRequestRegeneration?: () => void;
  // Download props
  projectId: string;
}

// Batch size options
const BATCH_OPTIONS = [5, 10, 25, 50, 100];

export function QuickActions({
  totalScenes,
  scenesWithImages,
  imageResolution,
  isGeneratingAllImages,
  onCopyPrompts,
  onGenerateAllImages,
  onGenerateBatch,
  onStopGeneration,
  backgroundJobProgress,
  selectedCount = 0,
  onSelectAll,
  onSelectAllWithImages,
  onClearSelection,
  onRegenerateSelected,
  onRequestRegeneration,
  projectId,
}: QuickActionsProps) {
  const t = useTranslations();
  const remainingImages = totalScenes - scenesWithImages;
  const costPerImage = getImageCost(imageResolution);

  // Confirmation dialog for generate all
  const [showGenerateAllConfirm, setShowGenerateAllConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle download all images and prompts via server API
  const handleDownloadAll = async () => {
    setIsDownloading(true);
    toast.info(`Preparing download for ${scenesWithImages} images... This may take a moment for large files.`);

    try {
      const response = await fetch(`/api/projects/${projectId}/download-images`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download images');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'scene-images.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download complete! ZIP file with images and prompts has been downloaded.');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download images and prompts');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGenerateAllClick = () => {
    if (remainingImages > 5) {
      setShowGenerateAllConfirm(true);
    } else {
      onGenerateAllImages();
    }
  };

  // Build selection options for the shared component
  const selectionOptions = [];
  if (onSelectAll) {
    selectionOptions.push({
      label: 'Select All',
      count: totalScenes,
      onClick: onSelectAll,
      variant: 'orange' as const,
    });
  }
  if (scenesWithImages > 0 && onSelectAllWithImages) {
    selectionOptions.push({
      label: 'With Images',
      count: scenesWithImages,
      onClick: onSelectAllWithImages,
      variant: 'emerald' as const,
    });
  }

  return (
    <div className="space-y-4">
      {/* Selection Controls - using shared component */}
      {totalScenes > 0 && onSelectAll && onClearSelection && (
        <SelectionQuickActions
          selectedCount={selectedCount}
          isDisabled={isGeneratingAllImages}
          selectionOptions={selectionOptions}
          onClearSelection={onClearSelection}
          primaryAction={onRegenerateSelected ? {
            label: 'Regenerate Selected',
            onClick: onRegenerateSelected,
            costPerItem: costPerImage,
            icon: <RefreshCw className="w-4 h-4 mr-2" />,
            confirmThreshold: 5,
            confirmTitle: `Regenerate ${selectedCount} images?`,
            confirmDescription: `You are about to regenerate ${selectedCount} selected images. This will cost approximately ${formatCostCompact(costPerImage * selectedCount)}. Are you sure you want to continue?`,
          } : undefined}
          onRequestApproval={onRequestRegeneration}
        />
      )}

      {/* Main Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        {/* Copy Prompts Button */}
        <Button
          variant="outline"
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          disabled={totalScenes === 0}
          onClick={onCopyPrompts}
        >
          <Copy className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Copy Prompts for Gemini</span>
          <Badge variant="outline" className="hidden sm:inline-flex ml-2 border-purple-500/30 text-purple-400 text-[10px] px-1.5 py-0">
            FREE
          </Badge>
        </Button>

        {/* Download All Button */}
        <Button
          variant="outline"
          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          disabled={scenesWithImages === 0 || isDownloading}
          onClick={handleDownloadAll}
        >
          <Download className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download All'}</span>
          <Badge variant="outline" className="hidden sm:inline-flex ml-2 border-blue-500/30 text-blue-400 text-[10px] px-1.5 py-0">
            {scenesWithImages}
          </Badge>
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
              onClick={handleGenerateAllClick}
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

      {/* Confirmation Dialog - Generate All */}
      <AlertDialog open={showGenerateAllConfirm} onOpenChange={setShowGenerateAllConfirm}>
        <AlertDialogContent className="glass-strong border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Generate {remainingImages} images?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to generate {remainingImages} images. This will cost approximately {formatCostCompact(costPerImage * remainingImages)}.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0"
              onClick={() => {
                setShowGenerateAllConfirm(false);
                onGenerateAllImages();
              }}
            >
              Yes, Generate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
