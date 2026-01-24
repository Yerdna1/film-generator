import { useMemo, useCallback } from 'react';
import type { Scene } from '@/types/project';
import { getImageCreditCost } from '@/lib/services/credits';
import { formatCostCompact } from '@/lib/services/real-costs';
import { RefreshCw } from 'lucide-react';

interface UseSceneGeneratorSelectionProps {
  scenes: Scene[];
  scenesWithImages: number;
  imageResolution: string;
  selectedScenes: Set<string>;
  isGenerating: boolean;
  selectAll: (scenes: Scene[]) => void;
  selectAllWithImages: () => void;
  handleRegenerateSelected: () => void;
  clearSelection: () => void;
}

interface SelectionOption {
  label: string;
  count: number;
  onClick: () => void;
  variant: 'orange' | 'emerald' | 'amber';
}

/**
 * Hook to manage selection options and quick actions for scene batch operations
 */
export function useSceneGeneratorSelection({
  scenes,
  scenesWithImages,
  imageResolution,
  selectedScenes,
  isGenerating,
  selectAll,
  selectAllWithImages,
  handleRegenerateSelected,
  clearSelection,
}: UseSceneGeneratorSelectionProps) {
  /**
   * Build selection options for SelectionQuickActions
   */
  const selectionOptions = useMemo((): SelectionOption[] => {
    const options: SelectionOption[] = [];
    if (selectAll) {
      options.push({
        label: 'Select All',
        count: scenes.length,
        onClick: () => selectAll(scenes),
        variant: 'orange',
      });
    }
    if (scenesWithImages > 0 && selectAllWithImages) {
      options.push({
        label: 'With Images',
        count: scenesWithImages,
        onClick: selectAllWithImages,
        variant: 'emerald',
      });
    }
    const scenesNeedingImages = scenes.length - scenesWithImages;
    if (scenesNeedingImages > 0 && selectAll) {
      options.push({
        label: 'Without Images',
        count: scenesNeedingImages,
        onClick: () => selectAll(scenes.filter(s => !s.imageUrl)),
        variant: 'amber',
      });
    }
    return options;
  }, [scenes.length, scenesWithImages, selectAll, selectAllWithImages, scenes]);

  /**
   * Get selected scenes data for the regeneration request dialog
   */
  const getSelectedScenesData = useCallback((scenes: Scene[], selectedScenes: Set<string>) => {
    return scenes
      .filter(s => selectedScenes.has(s.id))
      .map(s => ({
        id: s.id,
        title: s.title,
        number: s.number,
        imageUrl: s.imageUrl,
      }));
  }, []);

  return {
    selectionOptions,
    getSelectedScenesData,
  };
}

/**
 * Helper function to create the SelectionQuickActions props
 */
export interface SelectionQuickActionsProps {
  isGenerating: boolean;
  imageResolution: string;
  selectedScenes: Set<string>;
  selectionOptions: SelectionOption[];
  handleRegenerateSelected: () => void;
  clearSelection: () => void;
}

export function createSelectionQuickActionsProps({
  isGenerating,
  imageResolution,
  selectedScenes,
  selectionOptions,
  handleRegenerateSelected,
  clearSelection,
}: SelectionQuickActionsProps) {
  const costPerImage = getImageCreditCost(imageResolution);

  return {
    selectedCount: selectedScenes.size,
    isDisabled: isGenerating,
    selectionOptions,
    onClearSelection: clearSelection,
    primaryAction: {
      label: 'Regenerate Selected',
      onClick: handleRegenerateSelected,
      costPerItem: costPerImage,
      icon: <RefreshCw className="w-4 h-4 mr-2" />,
      confirmThreshold: 5,
      confirmTitle: `Regenerate ${selectedScenes.size} images?`,
      confirmDescription: `You are about to regenerate ${selectedScenes.size} selected images. This will cost approximately ${formatCostCompact(costPerImage * selectedScenes.size)}. Are you sure you want to continue?`,
    },
  };
}
