import type { Project, UnifiedModelConfig, ApiConfig } from '@/types/project';
import type { UserConstants } from './types';

/**
 * Creates a default UnifiedModelConfig from user's API settings and project settings
 * Used for migrating existing projects to the new model configuration system
 */
export function createModelConfigFromLegacySettings(
  project: Project,
  apiConfig: ApiConfig,
  userConstants: UserConstants | null
): UnifiedModelConfig {
  // Extract LLM configuration from project settings and API config
  const llmModel = (() => {
    // Map storyModel selection to actual model ID
    const storyModelMapping: Record<string, string> = {
      'gpt-4': 'openai/gpt-4-turbo',
      'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',
      'gemini-3-pro': 'google/gemini-2.0-flash-exp:free',
    };

    if (apiConfig.llmProvider === 'openrouter' && apiConfig.openRouterModel) {
      return apiConfig.openRouterModel;
    }

    const storyModel = project.settings?.storyModel || 'gemini-3-pro';
    return storyModelMapping[storyModel] || 'google/gemini-2.0-flash-exp:free';
  })();

  // Build the unified model configuration
  const modelConfig: UnifiedModelConfig = {
    // LLM Configuration
    llm: {
      provider: (apiConfig.llmProvider || 'openrouter') as any,
      model: llmModel,
      modalEndpoint: apiConfig.modalEndpoints?.llmEndpoint,
    },

    // Image Generation Configuration
    image: {
      provider: (apiConfig.imageProvider || userConstants?.characterImageProvider || 'gemini') as any,
      model: apiConfig.kieImageModel || 'seedream/4-5-text-to-image',
      modalEndpoint: apiConfig.modalEndpoints?.imageEndpoint,
      characterAspectRatio: (userConstants?.characterAspectRatio || '1:1') as any,
      sceneAspectRatio: (userConstants?.sceneAspectRatio || project.settings?.aspectRatio || '16:9') as any,
      sceneResolution: (userConstants?.sceneImageResolution || project.settings?.imageResolution || '2k') as any,
    },

    // Video Generation Configuration
    video: {
      provider: (apiConfig.videoProvider || 'kie') as any,
      model: apiConfig.kieVideoModel || 'grok-imagine/image-to-video',
      modalEndpoint: apiConfig.modalEndpoints?.videoEndpoint,
      resolution: (userConstants?.videoResolution || project.settings?.resolution || 'hd') as any,
    },

    // Text-to-Speech Configuration
    tts: {
      provider: (apiConfig.ttsProvider || project.settings?.voiceProvider || 'gemini-tts') as any,
      model: apiConfig.kieTtsModel || 'elevenlabs/text-to-dialogue-v3',
      modalEndpoint: apiConfig.modalEndpoints?.ttsEndpoint,
      defaultLanguage: project.settings?.voiceLanguage || 'en',
    },

    // Background Music Configuration
    music: {
      provider: (apiConfig.musicProvider || 'piapi') as any,
      model: apiConfig.kieMusicModel || 'suno/v3-5-music',
      modalEndpoint: apiConfig.modalEndpoints?.musicEndpoint,
    },
  };

  return modelConfig;
}

/**
 * Checks if a project needs migration to the new model configuration system
 */
export function projectNeedsMigration(project: Project): boolean {
  return !project.modelConfig;
}

/**
 * Migrates a project to use the new model configuration system
 */
export async function migrateProjectModelConfig(
  project: Project,
  apiConfig: ApiConfig,
  userConstants: UserConstants | null
): Promise<Project> {
  if (!projectNeedsMigration(project)) {
    return project;
  }

  const modelConfig = createModelConfigFromLegacySettings(project, apiConfig, userConstants);

  const migratedProject: Project = {
    ...project,
    modelConfig,
    updatedAt: new Date().toISOString(),
  };

  // Save the migration to the database
  try {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ modelConfig }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Failed to save model config migration to database:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        projectId: project.id,
      });
    }
  } catch (error) {
    console.error('Error saving model config migration:', error);
  }

  return migratedProject;
}

/**
 * Migrates all projects that need migration
 */
export async function migrateAllProjects(
  projects: Project[],
  apiConfig: ApiConfig,
  userConstants: UserConstants | null
): Promise<Project[]> {
  const migratedProjects: Project[] = [];

  for (const project of projects) {
    if (projectNeedsMigration(project)) {
      const migrated = await migrateProjectModelConfig(project, apiConfig, userConstants);
      migratedProjects.push(migrated);
    } else {
      migratedProjects.push(project);
    }
  }

  return migratedProjects;
}