'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/lib/stores/project-store';
import { generateMasterPrompt } from '@/lib/prompts/master-prompt';
import type { Project } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { SettingsPanel } from './step1/SettingsPanel';
import { StoryForm } from './step1/StoryForm';
import { MasterPromptSection } from './step1/MasterPromptSection';
import { PresetStories } from './step1/PresetStories';
import { LoadingModal } from './step1/LoadingModal';
import { genres, tones, sceneOptions, storyModels, styleModels, voiceProviders, imageProviders } from './step1/constants';
import { storyPresets } from './step1/story-presets';

interface Step1Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
}

const videoLanguages = ['en', 'sk', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'] as const;

export function Step1PromptGenerator({ project: initialProject, isReadOnly = false }: Step1Props) {
  const t = useTranslations();
  const { updateStory, setMasterPrompt, updateSettings, updateProject, projects, updateUserConstants, userConstants } = useProjectStore();

  // Get live project data from store, but prefer initialProject for full data
  // Store may contain summary data without settings/story details
  const storeProject = projects.find(p => p.id === initialProject.id);
  // Check for story.title to determine if we have full data (not just summary)
  const hasFullData = storeProject?.story && typeof storeProject.story === 'object' && 'title' in storeProject.story;
  const project = hasFullData ? storeProject : initialProject;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(project.masterPrompt || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // New state for additional options - initialize from project settings
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4'>(
    project.settings?.aspectRatio || '16:9'
  );
  const [videoLanguage, setVideoLanguage] = useState<typeof videoLanguages[number]>(
    project.settings?.voiceLanguage || 'en'
  );
  const [storyModel, setStoryModel] = useState<'gpt-4' | 'claude-sonnet-4.5' | 'gemini-3-pro'>(
    project.settings?.storyModel || 'claude-sonnet-4.5'
  );
  const [styleModel, setStyleModel] = useState(
    project.settings?.imageResolution === '4k' ? 'flux' : 'dall-e-3'
  );
  const [voiceProvider, setVoiceProvider] = useState<'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts'>(
    project.settings?.voiceProvider || 'gemini-tts'
  );
  const [imageProvider, setImageProvider] = useState<'gemini' | 'modal' | 'modal-edit'>(
    (userConstants?.sceneImageProvider as 'gemini' | 'modal' | 'modal-edit' | undefined) || 'gemini'
  );

  // Sync editedPrompt when masterPrompt changes
  useEffect(() => {
    if (project.masterPrompt) {
      setEditedPrompt(project.masterPrompt);
    }
  }, [project.masterPrompt]);

  // Update project settings when options change
  useEffect(() => {
    if (!isReadOnly && project.id) {
      updateSettings(project.id, { aspectRatio });
    }
  }, [aspectRatio, project.id, updateSettings, isReadOnly]);

  useEffect(() => {
    if (!isReadOnly && project.id) {
      updateSettings(project.id, { voiceLanguage: videoLanguage as 'sk' | 'en' });
    }
  }, [videoLanguage, project.id, updateSettings, isReadOnly]);

  useEffect(() => {
    if (!isReadOnly && project.id) {
      // Map style model to image resolution
      const imageResolution = styleModel === 'flux' ? '4k' :
        styleModel === 'midjourney' ? '2k' : '1k';
      updateSettings(project.id, { imageResolution });
    }
  }, [styleModel, project.id, updateSettings, isReadOnly]);

  useEffect(() => {
    if (!isReadOnly && project.id) {
      updateSettings(project.id, { voiceProvider });
    }
  }, [voiceProvider, project.id, updateSettings, isReadOnly]);

  useEffect(() => {
    if (!isReadOnly && project.id) {
      updateSettings(project.id, { storyModel });
    }
  }, [storyModel, project.id, updateSettings, isReadOnly]);

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);

    // Get current settings from project (they should already be synced via useEffect)
    // Define outside try block for fallback access in catch
    const currentSettings: import('@/types/project').ProjectSettings = {
      aspectRatio,
      resolution: (styleModel === 'flux' ? '4k' : 'hd') as 'hd' | '4k',
      voiceLanguage: videoLanguage as 'sk' | 'en',
      sceneCount: (project.settings?.sceneCount || 12) as 12 | 24 | 36 | 48 | 60 | 120 | 240 | 360,
      characterCount: project.settings?.characterCount || 3,
      imageResolution: (styleModel === 'flux' ? '4k' : '2k') as '1k' | '2k' | '4k',
      voiceProvider,
      storyModel,
    };

    // Generate the base master prompt template with current settings
    const projectWithCurrentSettings = {
      ...project,
      settings: currentSettings
    };

    // Generate base prompt outside try block so it's available in catch block for fallback
    const basePrompt = generateMasterPrompt(projectWithCurrentSettings.story, projectWithCurrentSettings.style, projectWithCurrentSettings.settings);

    try {
      // Small delay to ensure all settings are saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to enhance with user's configured LLM provider
      const response = await fetch('/api/llm/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: storyModel, // Use the model selected in left panel
          prompt: `Based on the following story concept and settings, enhance and expand this prompt for generating a ${currentSettings.sceneCount}-scene animated short film.

Story Title: ${project.story.title}
Genre: ${project.story.genre}
Tone: ${project.story.tone}
Setting: ${project.story.setting}
Concept: ${project.story.concept}
Visual Style: ${project.style}

Technical Settings:
- Aspect Ratio: ${aspectRatio}
- Video Language: ${videoLanguage}
- Story Model: ${storyModel}
- Style Model: ${styleModel}
- Voice Provider: ${voiceProvider}
- Characters: ${currentSettings.characterCount}
- Scenes: ${currentSettings.sceneCount}

Base prompt template:
${basePrompt}

Please enhance this prompt with:
1. More detailed character descriptions (visual appearance, personality, motivations)
2. Scene breakdown with specific camera shots and compositions
3. Text-to-Image prompts for each character and scene
4. Image-to-Video prompts describing movements and actions
5. Sample dialogue for each scene

Format the output exactly like the base template but with richer, more detailed content. Keep the same structure with CHARACTER: and SCENE: sections.`,
          systemPrompt: 'You are a professional film prompt engineer specializing in creating detailed prompts for animated films.',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setMasterPrompt(project.id, data.text);
          setEditedPrompt(data.text);
          // Dispatch credits update event
          window.dispatchEvent(new CustomEvent('credits-updated'));
          setIsGenerating(false);
          console.log(`Master prompt enhanced via ${data.provider}, ${data.creditsUsed} credits used`);
          return;
        }
      }

      // Check for insufficient credits error
      if (response.status === 402) {
        const errorData = await response.json();
        console.warn('Insufficient credits for AI enhancement:', errorData);
        // Fall back to local generation (free)
      }

      // Fallback to local generation if API fails or not enough credits
      console.warn('Using local generation (no credits deducted)');
      setMasterPrompt(project.id, basePrompt);
      setEditedPrompt(basePrompt);
    } catch (error) {
      console.error('Error generating prompt:', error);
      // Fallback to local generation with current settings (reuse basePrompt)
      setMasterPrompt(project.id, basePrompt);
      setEditedPrompt(basePrompt);
    }

    setIsGenerating(false);
  };

  const handleSaveEditedPrompt = () => {
    setMasterPrompt(project.id, editedPrompt);
    setIsEditing(false);
  };

  const handleApplyPreset = async (preset: typeof storyPresets[0]) => {
    setSelectedPresetId(preset.id);
    updateStory(project.id, preset.story);

    // Sync project name with story title
    updateProject(project.id, { name: preset.story.title });

    // Auto-generate the master prompt
    await handleGeneratePrompt();
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
          storyModel={storyModel}
          setStoryModel={setStoryModel}
          styleModel={styleModel}
          setStyleModel={setStyleModel}
          imageProvider={imageProvider}
          setImageProvider={setImageProvider}
          voiceProvider={voiceProvider}
          setVoiceProvider={setVoiceProvider}
          updateProject={updateProject}
          updateSettings={updateSettings}
          updateUserConstants={updateUserConstants}
          sceneOptions={sceneOptions}
          storyModels={storyModels}
          styleModels={styleModels}
          videoLanguages={videoLanguages}
          voiceProviders={voiceProviders}
          genres={genres}
          tones={tones}
        />

        {/* Right Column - Story Details, Presets & Master Prompt */}
        <div className="glass rounded-xl p-4 space-y-4 lg:col-span-3">
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
          />

          <MasterPromptSection
            project={project}
            isReadOnly={isReadOnly}
            isEditing={isEditing}
            editedPrompt={editedPrompt}
            setIsEditing={setIsEditing}
            setEditedPrompt={setEditedPrompt}
            onSaveEditedPrompt={handleSaveEditedPrompt}
          />
        </div>
      </div>

      {/* Loading Modal */}
      <LoadingModal isOpen={isGenerating} />
    </div>
  );
}
