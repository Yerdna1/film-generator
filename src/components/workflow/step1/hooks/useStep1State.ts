import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project } from '@/types/project';
import type { Step1State } from './types';
import { genres, tones, sceneOptions, storyModels, styleModels, voiceProviders, imageProviders } from '../constants';
import { usePromptPolling } from './usePromptPolling';

const videoLanguages = ['en', 'sk', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'] as const;

interface UseStep1StateProps {
  project: Project;
  isAdmin: boolean;
}

export function useStep1State({ project, isAdmin }: UseStep1StateProps) {
  const { updateStory, setMasterPrompt, updateSettings, updateProject, projects, updateUserConstants, userConstants, nextStep } = useProjectStore();
  const { data: session } = useSession();

  // Get live project data from store, but prefer initialProject for full data
  // Store may contain summary data without settings/story details
  const storeProject = projects.find(p => p.id === project.id);
  // Check for story.title to determine if we have full data (not just summary)
  const hasFullData = storeProject?.story && typeof storeProject.story === 'object' && 'title' in storeProject.story;
  const currentProject = hasFullData ? storeProject : project;

  // Subscription status - check if user has a paid plan
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session) {
        setIsPremiumUser(false);
        return;
      }
      try {
        const res = await fetch('/api/polar');
        if (res.ok) {
          const data = await res.json();
          // Premium if plan is anything other than 'free'
          const plan = data.subscription?.plan || 'free';
          setIsPremiumUser(plan !== 'free');
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        setIsPremiumUser(false);
      }
    };
    fetchSubscription();
  }, [session]);

  // Admins are always treated as premium users (bypass subscription check)
  const effectiveIsPremium = isAdmin || isPremiumUser;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(currentProject.masterPrompt || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Track current model and provider being used for generation
  const [generatingModel, setGeneratingModel] = useState<string | undefined>();
  const [generatingProvider, setGeneratingProvider] = useState<string | undefined>();


  // New state for additional options - initialize from project settings
  // For free users, enforce defaults
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4'>(
    currentProject.settings?.aspectRatio || '16:9'
  );
  const [videoLanguage, setVideoLanguage] = useState<typeof videoLanguages[number]>(
    // Free users default to English
    currentProject.settings?.voiceLanguage || 'en'
  );
  const [storyModel, setStoryModel] = useState<'gpt-4' | 'claude-sonnet-4.5' | 'gemini-3-pro'>(
    // Free users use default model
    currentProject.settings?.storyModel || 'gemini-3-pro'
  );
  const [styleModel, setStyleModel] = useState(
    currentProject.settings?.imageResolution === '4k' ? 'flux' : 'dall-e-3'
  );
  const [voiceProvider, setVoiceProvider] = useState<'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts' | 'kie'>(
    // Free users use Gemini TTS
    currentProject.settings?.voiceProvider || 'gemini-tts'
  );
  const [imageProvider, setImageProvider] = useState<'gemini' | 'modal' | 'modal-edit' | 'kie'>(
    (userConstants?.sceneImageProvider as 'gemini' | 'modal' | 'modal-edit' | 'kie' | undefined) || 'gemini'
  );

  // All users can now select any model/style - no enforcement needed
  // Premium/admin users will use organization API keys, free users will use their own

  // Sync editedPrompt when masterPrompt changes
  useEffect(() => {
    if (currentProject.masterPrompt) {
      setEditedPrompt(currentProject.masterPrompt);
    }
  }, [currentProject.masterPrompt]);

  // Update project settings when options change
  useEffect(() => {
    if (currentProject.id) {
      updateSettings(currentProject.id, { aspectRatio });
    }
  }, [aspectRatio, currentProject.id, updateSettings]);

  useEffect(() => {
    if (currentProject.id) {
      updateSettings(currentProject.id, { voiceLanguage: videoLanguage as 'sk' | 'en' });
    }
  }, [videoLanguage, currentProject.id, updateSettings]);

  useEffect(() => {
    if (currentProject.id) {
      // Map style model to image resolution
      const imageResolution = styleModel === 'flux' ? '4k' :
        styleModel === 'midjourney' ? '2k' : '1k';
      updateSettings(currentProject.id, { imageResolution });
    }
  }, [styleModel, currentProject.id, updateSettings]);

  useEffect(() => {
    if (currentProject.id) {
      updateSettings(currentProject.id, { voiceProvider });
    }
  }, [voiceProvider, currentProject.id, updateSettings]);

  useEffect(() => {
    if (currentProject.id) {
      updateSettings(currentProject.id, { storyModel });
    }
  }, [storyModel, currentProject.id, updateSettings]);

  // Use polling hook for prompt generation jobs
  const polling = usePromptPolling(currentProject);

  return {
    // Project
    project: currentProject,
    store: {
      updateStory,
      setMasterPrompt,
      updateSettings,
      updateProject,
      updateUserConstants,
      nextStep,
    },
    userConstants,

    // Subscription
    isPremiumUser,
    effectiveIsPremium,
    isAdmin,

    // Form state
    isGenerating,
    setIsGenerating,
    isEditing,
    setIsEditing,
    editedPrompt,
    setEditedPrompt,
    selectedPresetId,
    setSelectedPresetId,
    generatingModel,
    setGeneratingModel,
    generatingProvider,
    setGeneratingProvider,


    // Settings
    aspectRatio,
    setAspectRatio,
    videoLanguage,
    setVideoLanguage,
    storyModel,
    setStoryModel,
    styleModel,
    setStyleModel,
    voiceProvider,
    setVoiceProvider,
    imageProvider,
    setImageProvider,

    // Constants
    videoLanguages,

    // Polling state for background jobs
    ...polling,
  };
}
