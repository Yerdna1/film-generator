'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
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
  AuthBanner,
  PreviewSection,
  RenderOptionsPanel,
  SidePanelToggle,
  MobileSidePanelToggle,
} from './components';
import { StepActionBar } from '../shared/StepActionBar';
import { Download } from 'lucide-react';

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

  // Get live project data from store, but prefer initialProject for full data (scenes array)
  const storeProject = projects.find((p) => p.id === initialProject.id);
  const project = storeProject?.scenes ? storeProject : initialProject;

  // Safe accessor for scenes array
  const scenes = project.scenes || [];

  // Custom hooks
  const { stats } = useProjectStats(project);
  const previewPlayer = usePreviewPlayer(project);
  const backgroundMusic = useBackgroundMusic(project);
  const videoComposer = useVideoComposer(project);
  const exportHandlers = useExportHandlers(project);

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

      {/* Authentication Banner */}
      {!isAuthenticated && <AuthBanner />}

      {/* Main Editor Layout */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Preview Section */}
        <div className="flex-1 min-w-0">
          <PreviewSection
            project={project}
            stats={stats}
            isAuthenticated={isAuthenticated}
            previewPlayer={previewPlayer}
          />
        </div>

        {/* Side Panel - Render Options */}
        <RenderOptionsPanel
          isOpen={sidePanelOpen}
          onClose={() => setSidePanelOpen(false)}
          scenes={scenes}
          isAuthenticated={isAuthenticated}
          isReadOnly={isReadOnly}
          backgroundMusic={backgroundMusic}
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
    </div>
  );
}