import type { Project } from '@/types/project';
import type { Dispatch, SetStateAction } from 'react';

export type Setter<T> = Dispatch<SetStateAction<T>>;

export interface Step1State {
  // Project
  project: Project;
  store: {
    updateStory: (id: string, story: any) => void;
    setMasterPrompt: (id: string, prompt: string) => void;
    updateSettings: (id: string, settings: any) => void;
    updateProject: (id: string, updates: any) => void;
    updateUserConstants: (constants: any) => void;
    nextStep: (id: string) => void;
    updateModelConfig: (id: string, config: any) => void;
  };
  userConstants: any;

  // Subscription
  isPremiumUser: boolean;
  effectiveIsPremium: boolean;
  isAdmin: boolean;

  // Form state
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  editedPrompt: string;
  setEditedPrompt: (value: string) => void;
  selectedPresetId: string | null;
  setSelectedPresetId: (value: string | null) => void;

  // Modal state
  isModelConfigModalOpen: boolean;
  setIsModelConfigModalOpen: (value: boolean) => void;
  pendingGenerateAction: (() => void) | null;
  setPendingGenerateAction: (action: (() => void) | null) => void;

  // Settings
  aspectRatio: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4';
  setAspectRatio: (value: '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | '3:4') => void;
  videoLanguage: string;
  setVideoLanguage: Dispatch<SetStateAction<any>>;
  storyModel: 'gpt-4' | 'claude-sonnet-4.5' | 'gemini-3-pro';
  setStoryModel: (value: 'gpt-4' | 'claude-sonnet-4.5' | 'gemini-3-pro') => void;
  styleModel: string;
  setStyleModel: (value: string) => void;
  voiceProvider: 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts' | 'kie';
  setVoiceProvider: (value: 'gemini-tts' | 'elevenlabs' | 'modal' | 'openai-tts' | 'kie') => void;
  imageProvider: 'gemini' | 'modal' | 'modal-edit' | 'kie';
  setImageProvider: (value: 'gemini' | 'modal' | 'modal-edit' | 'kie') => void;

  // Constants
  videoLanguages: readonly string[];
}
