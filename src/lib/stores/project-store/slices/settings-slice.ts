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
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelConfig: updatedModelConfig }),
        });
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
