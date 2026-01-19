'use client';

import { useTranslations } from 'next-intl';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { SettingsPanel } from './step1/SettingsPanel';
import { StoryForm } from './step1/StoryForm';
import { MasterPromptSection } from './step1/MasterPromptSection';
import { PresetStories } from './step1/PresetStories';
import { LoadingModal } from './step1/LoadingModal';
import { genres, tones, sceneOptions, storyModels, styleModels, voiceProviders, imageProviders } from './step1/constants';
import { useStep1State, useStep1Handlers } from './step1/hooks';
import type { UnifiedModelConfig } from '@/types/project';
import { useApiKeys } from '@/hooks/use-api-keys';
import { toast } from 'sonner';

interface Step1Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  userGlobalRole?: string;
  isAdmin?: boolean;
  isReadOnly?: boolean;
}

export function Step1PromptGenerator({
  project: initialProject,
  userGlobalRole,
  isAdmin = false,
  isReadOnly = false,
}: Step1Props) {
  const t = useTranslations();

  // Custom hooks for state and handlers
  const state = useStep1State({ project: initialProject, isAdmin });
  // API Keys hook
  const { data: apiKeysData, mutate: mutateApiKeys } = useApiKeys();

  const handlers = useStep1Handlers({ ...state, apiKeys: apiKeysData });

  const {
    project,
    effectiveIsPremium,
    isGenerating,
    isEditing,
    editedPrompt,
    setEditedPrompt,
    setIsEditing,
    selectedPresetId,
    aspectRatio,
    setAspectRatio,
    videoLanguage,
    setVideoLanguage,
    storyModel,
    setStoryModel,
    styleModel,
    setStyleModel,
    imageProvider,
    setImageProvider,
    voiceProvider,
    setVoiceProvider,
    videoLanguages,
    generatingModel,
    generatingProvider,
  } = state;

  const {
    handleGeneratePrompt,
    handleSaveEditedPrompt,
    handleApplyPreset,
    handleModelConfigChange,
  } = handlers;

  const handleModelConfigChangeWrapper = (modelConfig: UnifiedModelConfig) => {
    if (!isReadOnly && project.id) {
      handleModelConfigChange(modelConfig);
    }
  };

  const handleSaveApiKey = async (keyName: string, value: string) => {
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [keyName]: value }),
      });

      if (!response.ok) throw new Error('Failed to save API key');

      toast.success(t('step1.modelConfiguration.keySaved'));
      mutateApiKeys();
    } catch (error) {
      toast.error(t('step1.modelConfiguration.keySaveFailed'));
      console.error(error);
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto">
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar - Settings */}
        <SettingsPanel
          project={project}
          isReadOnly={isReadOnly}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          videoLanguage={videoLanguage}
          setVideoLanguage={setVideoLanguage as (lang: string | ((prev: string) => string)) => void}
          styleModel={styleModel}
          setStyleModel={setStyleModel}
          updateProject={state.store.updateProject}
          updateSettings={state.store.updateSettings}
          sceneOptions={sceneOptions}
          styleModels={styleModels}
          videoLanguages={videoLanguages}
          modelConfig={project.modelConfig}
          onModelConfigChange={handleModelConfigChangeWrapper}
          isPremiumUser={effectiveIsPremium}
        />

        {/* Right Column - Story Details, Presets & Master Prompt */}
        <div className="glass rounded-xl p-4 space-y-4 lg:col-span-3">
          <StoryForm
            project={project}
            isReadOnly={isReadOnly}
            isGenerating={isGenerating}
            onGeneratePrompt={handleGeneratePrompt}
            updateStory={state.store.updateStory}
            updateProject={state.store.updateProject}
            genres={genres}
            tones={tones}
          />

          <PresetStories
            selectedPresetId={selectedPresetId}
            onApplyPreset={handleApplyPreset}
            isReadOnly={isReadOnly}
            isPremiumUser={effectiveIsPremium}
          />

          <MasterPromptSection
            project={project}
            isReadOnly={isReadOnly}
            userGlobalRole={userGlobalRole}
            isAdmin={isAdmin}
            isEditing={isEditing}
            editedPrompt={editedPrompt}
            setIsEditing={setIsEditing}
            setEditedPrompt={setEditedPrompt}
            onSaveEditedPrompt={handleSaveEditedPrompt}
          />
        </div>
      </div>

      {/* Loading Modal */}
      <LoadingModal
        isOpen={isGenerating}
        model={generatingModel}
        provider={generatingProvider}
      />

    </div>
  );
}
