import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { Project, UnifiedModelConfig, ApiConfig } from '@/types/project';
import type { UserConstants } from '@/lib/stores/project-store/types';

interface UseModelConfigurationOptions {
  project: Project;
  isPremiumUser: boolean;
  isReadOnly: boolean;
  userConstants?: UserConstants | null;
  apiConfig?: ApiConfig;
}

export function useModelConfiguration({
  project,
  isPremiumUser,
  isReadOnly,
  userConstants,
  apiConfig,
}: UseModelConfigurationOptions) {
  const { updateModelConfig, updateSettings, updateProject } = useProjectStore();

  // Initialize model config with defaults if not present
  const [modelConfig, setModelConfig] = useState<UnifiedModelConfig>(() => {
    if (project.modelConfig) {
      return project.modelConfig;
    }

    // Create default config from existing settings
    return {
      llm: {
        provider: (apiConfig?.llmProvider || 'openrouter') as any,
        model: apiConfig?.openRouterModel || 'google/gemini-2.0-flash-exp:free',
        modalEndpoint: apiConfig?.modalEndpoints?.llmEndpoint,
      },
      image: {
        provider: (apiConfig?.imageProvider || userConstants?.characterImageProvider || 'gemini') as any,
        model: apiConfig?.kieImageModel || 'seedream/4-5-text-to-image',
        modalEndpoint: apiConfig?.modalEndpoints?.imageEndpoint,
        characterAspectRatio: (userConstants?.characterAspectRatio || '1:1') as any,
        sceneAspectRatio: (userConstants?.sceneAspectRatio || project.settings?.aspectRatio || '16:9') as any,
        sceneResolution: (userConstants?.sceneImageResolution || project.settings?.imageResolution || '2k') as any,
      },
      video: {
        provider: (apiConfig?.videoProvider || 'kie') as any,
        model: apiConfig?.kieVideoModel || 'grok-imagine/image-to-video',
        modalEndpoint: apiConfig?.modalEndpoints?.videoEndpoint,
        resolution: (userConstants?.videoResolution || project.settings?.resolution || 'hd') as any,
      },
      tts: {
        provider: (apiConfig?.ttsProvider || project.settings?.voiceProvider || 'gemini-tts') as any,
        model: apiConfig?.kieTtsModel || 'elevenlabs/text-to-dialogue-v3',
        modalEndpoint: apiConfig?.modalEndpoints?.ttsEndpoint,
        defaultLanguage: project.settings?.voiceLanguage || 'en',
      },
      music: {
        provider: (apiConfig?.musicProvider || 'piapi') as any,
        model: apiConfig?.kieMusicModel || 'suno/v3-5-music',
        modalEndpoint: apiConfig?.modalEndpoints?.musicEndpoint,
      },
    };
  });

  // Enforce free user limitations
  useEffect(() => {
    if (!isPremiumUser && !isReadOnly) {
      const freeUserConfig: Partial<UnifiedModelConfig> = {
        llm: {
          ...modelConfig.llm,
          provider: 'openrouter',
          model: 'google/gemini-2.0-flash-exp:free',
        },
        image: {
          ...modelConfig.image,
          provider: 'gemini',
        },
        video: {
          ...modelConfig.video,
          provider: 'kie',
        },
        tts: {
          ...modelConfig.tts,
          provider: 'gemini-tts',
          defaultLanguage: 'en',
        },
      };

      setModelConfig((prev) => ({ ...prev, ...freeUserConfig }));

      // Update project with free user config
      updateModelConfig(project.id, freeUserConfig);

      // Also enforce Disney/Pixar style for free users
      if (project.style !== 'disney-pixar') {
        updateProject(project.id, { style: 'disney-pixar' });
      }

      // Enforce max 12 scenes for free users
      if ((project.settings?.sceneCount || 12) > 12) {
        updateSettings(project.id, { sceneCount: 12 });
      }
    }
  }, [isPremiumUser, isReadOnly, project.id, project.style, project.settings?.sceneCount, updateModelConfig, updateProject, updateSettings]);

  // Function to save user preferences globally
  const saveUserPreferences = useCallback(async (newConfig: UnifiedModelConfig) => {
    try {
      const payload: any = {
        llmProvider: newConfig.llm.provider,
        imageProvider: newConfig.image.provider,
        videoProvider: newConfig.video.provider,
        ttsProvider: newConfig.tts.provider,
        musicProvider: newConfig.music.provider,
      };

      // Map specific models if applicable
      if (newConfig.llm.provider === 'openrouter') {
        payload.openRouterModel = newConfig.llm.model;
      }

      if (newConfig.image.provider === 'kie') {
        payload.kieImageModel = newConfig.image.model;
      }

      if (newConfig.video.provider === 'kie') {
        payload.kieVideoModel = newConfig.video.model;
      }

      if (newConfig.tts.provider === 'kie') {
        payload.kieTtsModel = newConfig.tts.model;
      }

      if (newConfig.music.provider === 'kie') {
        payload.kieMusicModel = newConfig.music.model; // Use kieMusicModel for consistency (though DB field is just kieMusicModel if generic?)
      }

      // Map Modal Endpoints
      if (newConfig.llm.modalEndpoint) payload.modalLlmEndpoint = newConfig.llm.modalEndpoint;
      if (newConfig.image.modalEndpoint) payload.modalImageEndpoint = newConfig.image.modalEndpoint;
      if (newConfig.video.modalEndpoint) payload.modalVideoEndpoint = newConfig.video.modalEndpoint;
      if (newConfig.tts.modalEndpoint) payload.modalTtsEndpoint = newConfig.tts.modalEndpoint;
      if (newConfig.music.modalEndpoint) payload.modalMusicEndpoint = newConfig.music.modalEndpoint;

      await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to save user preferences', error);
    }
  }, []);

  const handleModelConfigChange = useCallback(
    (newConfig: UnifiedModelConfig) => {
      if (!isReadOnly && project.id) {
        setModelConfig(newConfig);
        updateModelConfig(project.id, newConfig);

        // Also update legacy settings for backward compatibility
        updateSettings(project.id, {
          aspectRatio: newConfig.image.sceneAspectRatio,
          imageResolution: newConfig.image.sceneResolution,
          resolution: newConfig.video.resolution,
          voiceLanguage: newConfig.tts.defaultLanguage as 'sk' | 'en',
          voiceProvider: newConfig.tts.provider,
        });

        // Save as user preference
        saveUserPreferences(newConfig);
      }
    },
    [isReadOnly, project.id, updateModelConfig, updateSettings, saveUserPreferences]
  );

  return {
    modelConfig,
    handleModelConfigChange,
  };
}