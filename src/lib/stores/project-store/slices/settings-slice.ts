import type { ProjectSettings, VoiceSettings, ApiConfig, UnifiedModelConfig } from '@/types/project';
import type { StateCreator } from '../types';
import { debounceSync } from '../utils';
import { defaultSettings } from '../defaults';

export interface SettingsSlice {
  updateSettings: (projectId: string, settings: Partial<ProjectSettings>) => void;
  updateModelConfig: (projectId: string, modelConfig: Partial<UnifiedModelConfig>) => void;
  updateVoiceSettings: (projectId: string, settings: Partial<VoiceSettings>) => void;
  setApiConfig: (config: Partial<ApiConfig>) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set, get) => ({
  updateSettings: (projectId, settings) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;

    const updatedSettings = { ...(project.settings || defaultSettings), ...settings };

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, settings: updatedSettings, updatedAt: new Date().toISOString() }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, settings: updatedSettings, updatedAt: new Date().toISOString() }
          : state.currentProject,
    }));

    debounceSync(async () => {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: updatedSettings }),
        });
      } catch (error) {
        console.error('Error syncing settings to DB:', error);
      }
    });
  },

  updateModelConfig: (projectId, modelConfig) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;

    // Deep merge for nested config
    const updatedModelConfig = project.modelConfig ? {
      llm: { ...project.modelConfig.llm, ...(modelConfig.llm || {}) },
      image: { ...project.modelConfig.image, ...(modelConfig.image || {}) },
      video: { ...project.modelConfig.video, ...(modelConfig.video || {}) },
      tts: { ...project.modelConfig.tts, ...(modelConfig.tts || {}) },
      music: { ...project.modelConfig.music, ...(modelConfig.music || {}) },
    } : modelConfig as UnifiedModelConfig;

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, modelConfig: updatedModelConfig, updatedAt: new Date().toISOString() }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, modelConfig: updatedModelConfig, updatedAt: new Date().toISOString() }
          : state.currentProject,
    }));

    debounceSync(async () => {
      try {
        // Sync to project
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelConfig: updatedModelConfig }),
        });

        // Also sync preferences to user's defaults (apiKeys table)
        // This makes Step 1 settings become the new defaults for future projects
        const syncPayload: Record<string, string | null> = {};

        if (updatedModelConfig.llm?.provider) {
          syncPayload.llmProvider = updatedModelConfig.llm.provider;
        }
        if (updatedModelConfig.llm?.model) {
          // Save model to provider-specific field
          if (updatedModelConfig.llm.provider === 'kie') {
            syncPayload.kieLlmModel = updatedModelConfig.llm.model;
          } else if (updatedModelConfig.llm.provider === 'openrouter') {
            syncPayload.openRouterModel = updatedModelConfig.llm.model;
          } else {
            // For other providers, also save to openRouterModel as fallback
            syncPayload.openRouterModel = updatedModelConfig.llm.model;
          }
        }
        if (updatedModelConfig.image?.provider) {
          syncPayload.imageProvider = updatedModelConfig.image.provider;
        }
        if (updatedModelConfig.image?.model) {
          syncPayload.kieImageModel = updatedModelConfig.image.model;
        }
        if (updatedModelConfig.video?.provider) {
          syncPayload.videoProvider = updatedModelConfig.video.provider;
        }
        if (updatedModelConfig.video?.model) {
          syncPayload.kieVideoModel = updatedModelConfig.video.model;
        }
        if (updatedModelConfig.tts?.provider) {
          syncPayload.ttsProvider = updatedModelConfig.tts.provider;
        }
        if (updatedModelConfig.tts?.model) {
          syncPayload.kieTtsModel = updatedModelConfig.tts.model;
        }
        if (updatedModelConfig.music?.provider) {
          syncPayload.musicProvider = updatedModelConfig.music.provider;
        }
        if (updatedModelConfig.music?.model) {
          syncPayload.kieMusicModel = updatedModelConfig.music.model;
        }

        if (Object.keys(syncPayload).length > 0) {
          await fetch('/api/user/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncPayload),
          });
          console.log('[ModelConfig] Synced preferences to user defaults:', Object.keys(syncPayload));
        }
      } catch (error) {
        console.error('Error syncing model config to DB:', error);
      }
    });
  },

  updateVoiceSettings: (projectId, settings) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;

    const defaultVoiceSettings = {
      language: 'en',
      provider: 'elevenlabs',
      characterVoices: {},
    };
    const updatedVoiceSettings = { ...(project.voiceSettings || defaultVoiceSettings), ...settings };

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, voiceSettings: updatedVoiceSettings, updatedAt: new Date().toISOString() }
          : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, voiceSettings: updatedVoiceSettings, updatedAt: new Date().toISOString() }
          : state.currentProject,
    }));

    debounceSync(async () => {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceSettings: updatedVoiceSettings }),
        });
      } catch (error) {
        console.error('Error syncing voice settings to DB:', error);
      }
    });
  },

  setApiConfig: (config) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, ...config },
    }));
  },
});
