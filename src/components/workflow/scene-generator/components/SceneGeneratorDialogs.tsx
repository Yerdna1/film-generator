import type { Scene } from '@/types/project';
import { FileText, ImageIcon } from 'lucide-react';
import { getImageCreditCost } from '@/lib/services/credits';
import { DEFAULT_MODELS } from '@/lib/constants/default-models';
import { UnifiedGenerateConfirmationDialog } from '../../shared/UnifiedGenerateConfirmationDialog';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';

interface SceneGeneratorDialogsProps {
  // Generate Scenes Dialog
  showGenerateDialog: boolean;
  setShowGenerateDialog: (show: boolean) => void;
  onConfirmGenerateScenes: () => Promise<void>;
  apiKeysLlmProvider?: string | null;
  apiKeysOpenRouterModel?: string | null;
  apiKeysKieLlmModel?: string | null;
  projectSettings: any;
  scenes: Scene[];
  sceneTextCreditsNeeded: number;

  // Generate Images Dialog
  showGenerateImagesDialog: boolean;
  setShowGenerateImagesDialog: (show: boolean) => void;
  onConfirmGenerateImages: () => Promise<void>;
  imageProvider?: string | null;
  imageModel?: string | null;
  projectSettingsForImages: any;

  // Request Regeneration Dialog
  showRequestRegenDialog: boolean;
  setShowRequestRegenDialog: (show: boolean) => void;
  projectId: string;
  selectedScenesData: Array<{
    id: string;
    title: string;
    number: number;
    imageUrl?: string | null;
  }>;
  onClearSelection?: () => void;
  onFetchRegenerationRequests?: () => void;
}

/**
 * Component containing all confirmation dialogs for Step3 Scene Generator
 * Includes Generate Scenes, Generate Images, and Request Regeneration dialogs
 */
export function SceneGeneratorDialogs({
  // Generate Scenes Dialog
  showGenerateDialog,
  setShowGenerateDialog,
  onConfirmGenerateScenes,
  apiKeysLlmProvider,
  apiKeysOpenRouterModel,
  apiKeysKieLlmModel,
  projectSettings,
  scenes,
  sceneTextCreditsNeeded,

  // Generate Images Dialog
  showGenerateImagesDialog,
  setShowGenerateImagesDialog,
  onConfirmGenerateImages,
  imageProvider,
  imageModel,
  projectSettingsForImages,

  // Request Regeneration Dialog
  showRequestRegenDialog,
  setShowRequestRegenDialog,
  projectId,
  selectedScenesData,
  onClearSelection,
  onFetchRegenerationRequests,
}: SceneGeneratorDialogsProps) {
  return (
    <>
      {/* Generate Scenes Confirmation Dialog */}
      <UnifiedGenerateConfirmationDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onConfirm={onConfirmGenerateScenes}
        operation="llm"
        provider={apiKeysLlmProvider || 'openrouter'}
        model={
          apiKeysLlmProvider === 'kie'
            ? (apiKeysKieLlmModel || DEFAULT_MODELS.kieLlmModel)
            : (apiKeysOpenRouterModel || 'default')
        }
        title="Generate Scenes"
        description={`This will generate text descriptions for ${projectSettings.sceneCount || 12} scenes using ${apiKeysLlmProvider === 'kie' ? 'KIE' : apiKeysLlmProvider || 'OpenRouter'}.`}
        details={[
          { label: 'Scenes to Generate', value: String(projectSettings.sceneCount || 12), icon: FileText },
          { label: 'Current Scenes', value: String(scenes.length), icon: FileText },
        ]}
        estimatedCost={sceneTextCreditsNeeded}
      />

      {/* Generate Images Confirmation Dialog */}
      <UnifiedGenerateConfirmationDialog
        isOpen={showGenerateImagesDialog}
        onClose={() => setShowGenerateImagesDialog(false)}
        onConfirm={onConfirmGenerateImages}
        operation="image"
        provider={imageProvider || 'gemini'}
        model={imageModel || 'default'}
        title="Generate Scene Images"
        description={`This will generate images for ${scenes.filter(s => !s.imageUrl).length} scenes using ${imageProvider}.`}
        details={[
          { label: 'Scenes without Images', value: scenes.filter(s => !s.imageUrl).length, icon: ImageIcon },
          { label: 'Resolution', value: (projectSettingsForImages.imageResolution || '2k').toUpperCase(), icon: ImageIcon },
          { label: 'Aspect Ratio', value: projectSettingsForImages.aspectRatio || '16:9', icon: ImageIcon },
        ]}
        estimatedCost={scenes.filter(s => !s.imageUrl).length * getImageCreditCost(
          (projectSettingsForImages.aspectRatio || '16:9') as any,
          (projectSettingsForImages.imageResolution || '2k') as any,
          imageProvider as any
        )}
      />

      {/* Request Regeneration Dialog */}
      <RequestRegenerationDialog
        projectId={projectId}
        targetType="image"
        scenes={selectedScenesData}
        open={showRequestRegenDialog}
        onOpenChange={setShowRequestRegenDialog}
        onRequestSent={() => {
          onClearSelection?.();
          onFetchRegenerationRequests?.();
        }}
      />
    </>
  );
}
