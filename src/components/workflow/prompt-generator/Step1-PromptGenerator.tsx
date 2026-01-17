'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';

// Components
import { SettingsPanel } from '../step1/SettingsPanel';
import { StoryForm } from '../step1/StoryForm';
import { MasterPromptSection } from '../step1/MasterPromptSection';
import { PresetStories } from '../step1/PresetStories';
import { LoadingModal } from '../step1/LoadingModal';
import { ApiKeyModal } from '../step1/ApiKeyModal';
import { ModelConfigurationPanel } from '../step1/ModelConfigurationPanel';

// Hooks
import { usePromptGeneration, useSubscriptionStatus, useModelConfiguration } from './hooks';

// Constants
import { genres, tones, sceneOptions } from './constants';
import { storyPresets } from '../step1/story-presets';

interface Step1Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  userGlobalRole?: string;
  isReadOnly?: boolean;
}

export function Step1PromptGenerator({ project: initialProject, userGlobalRole, isReadOnly = false }: Step1Props) {
  const t = useTranslations();
  const { updateStory, updateProject, projects, userConstants, apiConfig } = useProjectStore();

  // Get live project data from store
  const storeProject = projects.find(p => p.id === initialProject.id);
  const hasFullData = storeProject?.story && typeof storeProject.story === 'object' && 'title' in storeProject.story;
  const project = hasFullData ? storeProject : initialProject;

  // State
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userApiKeys, setUserApiKeys] = useState<{
    hasOpenRouterKey: boolean;
    openRouterModel: string;
    llmProvider: string;
  } | null>(null);

  // Custom hooks
  const { isPremiumUser, isLoading: isLoadingSubscription } = useSubscriptionStatus();

  const { modelConfig, handleModelConfigChange } = useModelConfiguration({
    project,
    isPremiumUser,
    isReadOnly,
    userConstants,
    apiConfig,
  });

  const {
    isGenerating,
    editedPrompt,
    setEditedPrompt,
    handleGeneratePrompt,
    handleSaveEditedPrompt,
  } = usePromptGeneration({
    project,
    isPremiumUser,
    onApiKeyRequired: () => setIsApiKeyModalOpen(true),
    userApiKeys,
  });

  // Load user API keys
  useEffect(() => {
    const fetchUserApiKeys = async () => {
      try {
        const res = await fetch('/api/user/api-keys');
        if (res.ok) {
          const data = await res.json();
          setUserApiKeys({
            hasOpenRouterKey: data.hasOpenRouterKey,
            openRouterModel: data.openRouterModel,
            llmProvider: data.llmProvider || 'openrouter',
          });
        }
      } catch (error) {
        console.error('Error fetching user API keys:', error);
      }
    };
    fetchUserApiKeys();
  }, []);

  const handleSaveApiKey = async (apiKey: string, model: string) => {
    setIsSavingApiKey(true);
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openRouterApiKey: apiKey, openRouterModel: model }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save API key' }));
        throw new Error(errorData.error || 'Failed to save API key');
      }

      setUserApiKeys((prev) => ({
        ...prev!,
        hasOpenRouterKey: true,
        openRouterModel: model,
      }));

      setIsApiKeyModalOpen(false);
      handleGeneratePrompt(true);
    } catch (error) {
      throw error;
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleApplyPreset = async (preset: typeof storyPresets[0]) => {
    setSelectedPresetId(preset.id);
    updateStory(project.id, preset.story);
    updateProject(project.id, {
      name: preset.story.title,
      style: preset.style,
    });
    await handleGeneratePrompt();
  };

  return (
    <div className="max-w-[1920px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar - Settings */}
        <SettingsPanel
          project={project}
          isReadOnly={isReadOnly}
          isPremiumUser={isPremiumUser}
          aspectRatio={modelConfig.image.sceneAspectRatio}
          setAspectRatio={(ratio) => handleModelConfigChange({
            ...modelConfig,
            image: { ...modelConfig.image, sceneAspectRatio: ratio },
          })}
          videoLanguage={modelConfig.tts.defaultLanguage || 'en'}
          setVideoLanguage={(lang: any) => {
            const newLang = typeof lang === 'function' ? lang(modelConfig.tts.defaultLanguage || 'en') : lang;
            handleModelConfigChange({
              ...modelConfig,
              tts: { ...modelConfig.tts, defaultLanguage: newLang as any },
            });
          }}
          storyModel={modelConfig.llm.model as any}
          setStoryModel={(model) => {
            const newModel = typeof model === 'function' ? model(modelConfig.llm.model as any) : model;
            handleModelConfigChange({
              ...modelConfig,
              llm: { ...modelConfig.llm, model: newModel },
            });
          }}
          styleModel={'gemini'}
          setStyleModel={() => { }}
          imageProvider={modelConfig.image.provider}
          setImageProvider={(provider) => {
            const newProvider = typeof provider === 'function' ? provider(modelConfig.image.provider as any) : provider;
            handleModelConfigChange({
              ...modelConfig,
              image: { ...modelConfig.image, provider: newProvider as any },
            });
          }}
          voiceProvider={modelConfig.tts.provider}
          setVoiceProvider={(provider: any) => {
            const newProvider = typeof provider === 'function' ? provider(modelConfig.tts.provider) : provider;
            handleModelConfigChange({
              ...modelConfig,
              tts: { ...modelConfig.tts, provider: newProvider as any },
            });
          }}
          updateProject={updateProject}
          updateSettings={() => { }}
          updateUserConstants={() => { }}
          sceneOptions={sceneOptions}
          storyModels={[]}
          styleModels={[]}
          videoLanguages={['en', 'sk', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'zh']}
          voiceProviders={[]}
          genres={genres}
          tones={tones}
        />

        {/* Right Column - Model Config, Story Details, Presets & Master Prompt */}
        <div className="glass rounded-xl p-4 space-y-4 lg:col-span-3">
          <ModelConfigurationPanel
            modelConfig={modelConfig}
            onConfigChange={handleModelConfigChange}
            disabled={isReadOnly}
          />

          <StoryForm
            project={project}
            isReadOnly={isReadOnly}
            isGenerating={isGenerating}
            onGeneratePrompt={handleGeneratePrompt}
            updateStory={updateStory}
            updateProject={updateProject}
            genres={genres}
            tones={tones}
          />

          <PresetStories
            selectedPresetId={selectedPresetId}
            onApplyPreset={handleApplyPreset}
            isReadOnly={isReadOnly}
            isPremiumUser={isPremiumUser}
          />

          <MasterPromptSection
            project={project}
            isReadOnly={isReadOnly}
            userGlobalRole={userGlobalRole}
            isEditing={isEditing}
            editedPrompt={editedPrompt}
            setIsEditing={setIsEditing}
            setEditedPrompt={setEditedPrompt}
            onSaveEditedPrompt={handleSaveEditedPrompt}
          />
        </div>
      </div>

      <LoadingModal isOpen={isGenerating} />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
        isLoading={isSavingApiKey}
      />
    </div>
  );
}