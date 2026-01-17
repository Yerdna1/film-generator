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
        provider: apiConfig?.llmProvider || 'openrouter',
        model: apiConfig?.openRouterModel || 'google/gemini-2.0-flash-exp:free',
        modalEndpoint: apiConfig?.modalEndpoints?.llmEndpoint,
      },
      image: {
        provider: apiConfig?.imageProvider || userConstants?.characterImageProvider || 'gemini',
        model: apiConfig?.kieImageModel || 'seedream/4-5-text-to-image',
        modalEndpoint: apiConfig?.modalEndpoints?.imageEndpoint,
        characterAspectRatio: userConstants?.characterAspectRatio || '1:1',
        sceneAspectRatio: userConstants?.sceneAspectRatio || project.settings?.aspectRatio || '16:9',
        sceneResolution: userConstants?.sceneImageResolution || project.settings?.imageResolution || '2k',
      },
      video: {
        provider: apiConfig?.videoProvider || 'kie',
        model: apiConfig?.kieVideoModel || 'grok-imagine/image-to-video',
        modalEndpoint: apiConfig?.modalEndpoints?.videoEndpoint,
        resolution: userConstants?.videoResolution || project.settings?.resolution || 'hd',
      },
      tts: {
        provider: apiConfig?.ttsProvider || project.settings?.voiceProvider || 'gemini-tts',
        model: apiConfig?.kieTtsModel || 'elevenlabs/text-to-dialogue-v3',
        modalEndpoint: apiConfig?.modalEndpoints?.ttsEndpoint,
        defaultLanguage: project.settings?.voiceLanguage || 'en',
      },
      music: {
        provider: apiConfig?.musicProvider || 'piapi',
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
      }
    },
    [isReadOnly, project.id, updateModelConfig, updateSettings]
  );

  return {
    modelConfig,
    handleModelConfigChange,
  };
}