'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import { useApiKeys } from '@/hooks';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';

// Hooks
import {
  useProjectStats,
  usePreviewPlayer,
  useBackgroundMusic,
  useVideoComposer,
  useExportHandlers,
} from '../export/hooks';

// Components
import {
  PreviewSection,
  RenderOptionsPanel,
  SidePanelToggle,
  MobileSidePanelToggle,
} from './components';
import { StepActionBar } from '../shared/StepActionBar';
import { UnifiedGenerateConfirmationDialog } from '../shared/UnifiedGenerateConfirmationDialog';
import { Download, Music } from 'lucide-react';

interface Step6Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export function Step6Export({
  project: initialProject,
  permissions,
  userRole,
  isReadOnly = false,
  isAuthenticated = false
}: Step6Props) {
  const t = useTranslations();
  const { projects } = useProjectStore();
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [showMusicGenerateDialog, setShowMusicGenerateDialog] = useState(false);

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  const storeProject = projects.find((p) => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Safe accessor for scenes array
  const scenes = project.scenes || [];

  // Get API keys for provider configuration
  const { data: apiKeys } = useApiKeys();

  // Custom hooks
  const { stats } = useProjectStats(project);
  const previewPlayer = usePreviewPlayer(project);
  const backgroundMusic = useBackgroundMusic({ project, apiKeys });
  const videoComposer = useVideoComposer(project);
  const exportHandlers = useExportHandlers(project);

  // Music generation with confirmation
  const handleGenerateMusicWithConfirm = async () => {
    // Show dialog and wait for user confirmation
    return new Promise<void>((resolve) => {
      setShowMusicGenerateDialog(true);
      // Store resolve function to be called after confirmation
      (handleGenerateMusicWithConfirm as any)._resolve = resolve;
    });
  };

  const handleConfirmMusicGeneration = async () => {
    setShowMusicGenerateDialog(false);
    await backgroundMusic.generateMusic();
    // Resolve the promise if it exists
    if ((handleGenerateMusicWithConfirm as any)._resolve) {
      (handleGenerateMusicWithConfirm as any)._resolve();
      delete (handleGenerateMusicWithConfirm as any)._resolve;
    }
  };

  // Wrap backgroundMusic with confirmation dialog
  const backgroundMusicWithConfirm = {
    ...backgroundMusic,
    generateMusic: handleGenerateMusicWithConfirm,
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-2 px-1">
      {/* Step Action Bar */}
      <StepActionBar
        title={t('steps.export.title')}
        icon={Download}
        subtitle=""
        operation="music"
        showApiKeyButton={true}
        actions={[]}
      />

      {/* Main Editor Layout */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Preview Section */}
        <div className="flex-1 min-w-0">
          <PreviewSection
            project={project}
            stats={stats}
            previewPlayer={previewPlayer}
          />
        </div>

        {/* Side Panel - Render Options */}
        <RenderOptionsPanel
          isOpen={sidePanelOpen}
          onClose={() => setSidePanelOpen(false)}
          scenes={scenes}
          isReadOnly={isReadOnly}
          backgroundMusic={backgroundMusicWithConfirm}
          videoComposer={videoComposer}
          stats={stats}
          project={project}
          exportHandlers={exportHandlers}
        />

        {/* Side Panel Toggle (when closed) */}
        {!sidePanelOpen && (
          <SidePanelToggle onClick={() => setSidePanelOpen(true)} />
        )}
      </div>

      {/* Mobile Side Panel Toggle Button */}
      <MobileSidePanelToggle
        isOpen={sidePanelOpen}
        onClick={() => setSidePanelOpen(!sidePanelOpen)}
      />

      {/* Music Generation Confirmation Dialog */}
      <UnifiedGenerateConfirmationDialog
        isOpen={showMusicGenerateDialog}
        onClose={() => setShowMusicGenerateDialog(false)}
        onConfirm={handleConfirmMusicGeneration}
        operation="music"
        provider={backgroundMusic.provider}
        model={backgroundMusic.model}
        title="Generate Background Music"
        description={`This will generate background music using ${backgroundMusic.provider === 'piapi' ? 'PiAPI' : backgroundMusic.provider}.`}
        details={[
          { label: 'Prompt', value: backgroundMusic.prompt.substring(0, 50) + (backgroundMusic.prompt.length > 50 ? '...' : ''), icon: Music },
          { label: 'Model', value: backgroundMusic.model, icon: Music },
          { label: 'Type', value: backgroundMusic.instrumental ? 'Instrumental' : 'With Vocals', icon: Music },
          { label: 'Duration', value: '~2-3 minutes', icon: Music },
        ]}
        estimatedCost={0.5} // Rough estimate for music generation
      />
    </div>
  );
}