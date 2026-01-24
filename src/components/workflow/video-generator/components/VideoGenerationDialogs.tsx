import { Video } from 'lucide-react';
import { RequestRegenerationDialog } from '@/components/collaboration/RequestRegenerationDialog';
import { InsufficientCreditsModal } from '@/components/workflow/character-generator/components/InsufficientCreditsModal';
import { KieVideoModal } from '../components';
import { UnifiedGenerateConfirmationDialog } from '../../shared/UnifiedGenerateConfirmationDialog';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { Scene } from '@/types/project';
import type { ApiKeysData } from '@/hooks/useApiKeys';

interface VideoGenerationDialogsProps {
  project: any;
  apiKeysData: ApiKeysData | null | undefined;
  selectedScenes: Set<string>;
  scenesNeedingGeneration: Scene[];
  isInsufficientCreditsModalOpen: boolean;
  isKieModalOpen: boolean;
  isSavingKieKey: boolean;
  showConfirmDialog: boolean;
  confirmDialogType: 'single' | 'all' | 'selected';
  confirmDialogScene: any;
  pendingVideoGeneration: any;
  showRequestRegenDialog: boolean;
  selectedScenesData: any[];

  // Callbacks
  onCloseInsufficientCredits: () => void;
  onCloseKieModal: () => void;
  onCloseConfirmDialog: () => void;
  onConfirmGeneration: () => void;
  onUseAppCredits: () => void;
  onSaveKieApiKey: (apiKey: string, model: string) => Promise<void>;
  onRequestSent: () => void;
  onOpenChangeRequestDialog: (open: boolean) => void;
}

export function VideoGenerationDialogs({
  project,
  apiKeysData,
  selectedScenes,
  scenesNeedingGeneration,
  isInsufficientCreditsModalOpen,
  isKieModalOpen,
  isSavingKieKey,
  showConfirmDialog,
  confirmDialogType,
  confirmDialogScene,
  pendingVideoGeneration,
  showRequestRegenDialog,
  selectedScenesData,
  onCloseInsufficientCredits,
  onCloseKieModal,
  onCloseConfirmDialog,
  onConfirmGeneration,
  onUseAppCredits,
  onSaveKieApiKey,
  onRequestSent,
  onOpenChangeRequestDialog,
}: VideoGenerationDialogsProps) {
  return (
    <>
      {/* Request Regeneration Dialog */}
      <RequestRegenerationDialog
        projectId={project.id}
        targetType="video"
        scenes={selectedScenesData}
        open={showRequestRegenDialog}
        onOpenChange={onOpenChangeRequestDialog}
        onRequestSent={onRequestSent}
      />

      {/* Insufficient Credits Modal for video generation */}
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={onCloseInsufficientCredits}
        onOpenKieModal={() => {
          onCloseInsufficientCredits();
          onCloseKieModal();
        }}
        onUseAppCredits={onUseAppCredits}
        creditsNeeded={ACTION_COSTS.video.grok * (pendingVideoGeneration?.scenes?.length || 1)}
        currentCredits={undefined}
        generationType="video"
      />

      {/* KIE AI API Key Modal for video generation */}
      <KieVideoModal
        isOpen={isKieModalOpen}
        onClose={onCloseKieModal}
        onSave={onSaveKieApiKey}
        isLoading={isSavingKieKey}
      />

      {/* Generate Videos Confirmation Dialog */}
      <UnifiedGenerateConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={onCloseConfirmDialog}
        onConfirm={onConfirmGeneration}
        operation="video"
        provider={apiKeysData?.videoProvider || 'kie'}
        model={apiKeysData?.kieVideoModel || 'default'}
        title={
          confirmDialogType === 'single'
            ? 'Generate Video'
            : confirmDialogType === 'selected'
            ? 'Generate Selected Videos'
            : 'Generate All Videos'
        }
        description={
          confirmDialogType === 'single' && confirmDialogScene
            ? `This will generate a video for "${confirmDialogScene.title}" using ${apiKeysData?.videoProvider || 'KIE'}.`
            : confirmDialogType === 'selected'
            ? `This will generate videos for ${selectedScenes.size} selected scenes using ${apiKeysData?.videoProvider || 'KIE'}.`
            : `This will generate videos for ${scenesNeedingGeneration.length} scenes using ${apiKeysData?.videoProvider || 'KIE'}.`
        }
        details={[
          confirmDialogType === 'single' && confirmDialogScene
            ? { label: 'Scene', value: confirmDialogScene.title, icon: Video }
            : confirmDialogType === 'selected'
            ? { label: 'Selected Scenes', value: selectedScenes.size, icon: Video }
            : { label: 'Scenes to Generate', value: scenesNeedingGeneration.length, icon: Video },
          { label: 'Resolution', value: '1024x576 (16:9)', icon: Video },
          { label: 'Duration', value: '~2 seconds', icon: Video },
        ]}
        estimatedCost={
          confirmDialogType === 'single'
            ? ACTION_COSTS.video.grok
            : confirmDialogType === 'selected'
            ? ACTION_COSTS.video.grok * selectedScenes.size
            : ACTION_COSTS.video.grok * scenesNeedingGeneration.length
        }
      />
    </>
  );
}
