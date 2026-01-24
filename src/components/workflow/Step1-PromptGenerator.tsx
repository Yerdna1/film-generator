'use client';

import { useTranslations } from 'next-intl';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { SettingsPanel } from './step1/SettingsPanel';
import { StoryForm } from './step1/StoryForm';
import { MasterPromptSection } from './step1/MasterPromptSection';
import { PresetStories } from './step1/PresetStories';
import { LoadingModal } from './shared';
import { genres, tones, sceneOptions, storyModels, styleModels, voiceProviders, imageProviders } from './step1/constants';
import { useStep1State, useStep1Handlers } from './step1/hooks';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { PaymentMethodToggle } from './PaymentMethodToggle';
import { StepActionBar } from './shared/StepActionBar';
import { FileText } from 'lucide-react';
import { toast } from '@/lib/toast';
import { UnifiedGenerateConfirmationDialog } from './shared/UnifiedGenerateConfirmationDialog';

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
  // API Keys context
  const apiKeysContext = useApiKeys();

  const handlers = useStep1Handlers({ ...state, apiKeys: apiKeysContext.apiKeys, apiKeysContext });

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
    // Job polling state
    promptJobId,
    promptJobProgress,
    promptJobStatus,
    isPromptJobRunning,
  } = state;

  const {
    handleGeneratePrompt,
    handleSaveEditedPrompt,
    handleApplyPreset,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    confirmDialogData,
    doGeneratePrompt,
  } = handlers;

  const handleSaveApiKey = async (keyName: string, value: string) => {
    const success = await apiKeysContext.updateApiKey(keyName, value);
    if (!success) {
      console.error('Failed to save API key');
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto">
      {/* Step Action Bar */}
      <StepActionBar
        title={t('steps.prompt.title')}
        icon={FileText}
        subtitle={project.story?.title || ''}
        operation="llm"
        showApiKeyButton={true}
        actions={[
          {
            label: isGenerating ? 'Generating...' : isPromptJobRunning ? 'Generation in Progress...' : 'Generate Main Prompt',
            onClick: handleGeneratePrompt,
            disabled: isGenerating || isReadOnly || isPromptJobRunning,
            variant: 'primary',
          },
        ]}
      />

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
          isPremiumUser={effectiveIsPremium}
        />

        {/* Right Column - Story Details, Presets & Master Prompt */}
        <div className="glass rounded-xl p-4 space-y-4 lg:col-span-3">
          <StoryForm
            project={project}
            isReadOnly={isReadOnly}
            updateStory={state.store.updateStory}
            updateProject={state.store.updateProject}
            genres={genres}
            tones={tones}
            paymentToggle={
              <PaymentMethodToggle
                operation="llm"
                className="mb-3"
              />
            }
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
        isOpen={isGenerating || isPromptJobRunning}
        model={generatingModel}
        provider={generatingProvider}
        progress={isPromptJobRunning ? promptJobProgress : undefined}
        title={isPromptJobRunning ? "Generating Master Prompt" : undefined}
        description={isPromptJobRunning ?
          promptJobStatus === 'processing' ?
            "Your prompt is being generated in the background. This may take a moment." :
            "Starting prompt generation..." :
          undefined}
      />

      <UnifiedGenerateConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={doGeneratePrompt}
        operation="llm"
        provider={confirmDialogData.provider}
        model={confirmDialogData.model}
        title="Generate Main Prompt"
        description={`This will generate a comprehensive master prompt for your ${project.settings?.sceneCount || 12}-scene film using ${confirmDialogData.provider}.`}
        details={[
          { label: 'Story Title', value: project.story?.title || 'Untitled' },
          { label: 'Genre', value: project.story?.genre || 'Unknown' },
          { label: 'Tone', value: project.story?.tone || 'Unknown' },
          { label: 'Scene Count', value: project.settings?.sceneCount || 12 },
          { label: 'Character Count', value: project.settings?.characterCount || 3 },
          { label: 'Aspect Ratio', value: aspectRatio },
        ]}
        estimatedCost={0.1} // Rough estimate for prompt generation
      />

    </div>
  );
}
