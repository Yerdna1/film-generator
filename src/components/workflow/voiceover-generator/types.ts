import type { Project, Character, DialogueLine, VoiceProvider, VoiceLanguage } from '@/types/project';
import type { ProjectPermissions, ProjectRole } from '@/types/collaboration';
import { ItemGenerationState } from '@/lib/constants/workflow';

export interface Step5Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
}

export type AudioState = Record<string, ItemGenerationState>;

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

// ElevenLabs voices (English)
export const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: 'rachel', name: 'Rachel', description: 'Calm, young, American female' },
  { id: 'drew', name: 'Drew', description: 'Well-rounded, American male' },
  { id: 'clyde', name: 'Clyde', description: 'War veteran, American male' },
  { id: 'paul', name: 'Paul', description: 'Ground reporter, American male' },
  { id: 'domi', name: 'Domi', description: 'Strong, young, American female' },
  { id: 'dave', name: 'Dave', description: 'British, conversational male' },
  { id: 'fin', name: 'Fin', description: 'Irish, sailing male' },
  { id: 'sarah', name: 'Sarah', description: 'Soft, young, American female' },
  { id: 'antoni', name: 'Antoni', description: 'Well-rounded, young, American male' },
  { id: 'thomas', name: 'Thomas', description: 'Calm, young, American male' },
  { id: 'charlie', name: 'Charlie', description: 'Casual, Australian male' },
  { id: 'emily', name: 'Emily', description: 'Calm, young, American female' },
];

// Gemini TTS voices (supports Slovak and other languages)
export const GEMINI_VOICES: VoiceOption[] = [
  { id: 'Aoede', name: 'Aoede', description: 'Natural female voice' },
  { id: 'Charon', name: 'Charon', description: 'Deep male voice' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Young male voice' },
  { id: 'Kore', name: 'Kore', description: 'Soft female voice' },
  { id: 'Puck', name: 'Puck', description: 'Playful voice' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Gentle voice' },
  { id: 'Enceladus', name: 'Enceladus', description: 'Clear male voice' },
  { id: 'Iapetus', name: 'Iapetus', description: 'Warm male voice' },
];

// Helper to migrate old placeholder voice IDs to valid Gemini TTS voices
export const getValidGeminiVoice = (voiceId: string | undefined): string => {
  if (voiceId && GEMINI_VOICES.some(v => v.id.toLowerCase() === voiceId.toLowerCase())) {
    const found = GEMINI_VOICES.find(v => v.id.toLowerCase() === voiceId.toLowerCase());
    return found?.id || 'Aoede';
  }
  const migrationMap: Record<string, string> = {
    'sk-male-1': 'Charon',
    'sk-male-2': 'Fenrir',
    'sk-male-3': 'Enceladus',
    'sk-male-4': 'Iapetus',
    'sk-female-1': 'Aoede',
    'sk-female-2': 'Kore',
    'sk-female-3': 'Zephyr',
    'sk-child-1': 'Puck',
  };
  return migrationMap[voiceId || ''] || 'Aoede';
};

export const getVoicesForProvider = (provider: VoiceProvider): VoiceOption[] => {
  return provider === 'gemini-tts' ? GEMINI_VOICES : ELEVENLABS_VOICES;
};

export interface DialogueLineWithScene extends DialogueLine {
  sceneId: string;
  sceneTitle: string;
  sceneNumber: number;
}

export interface VoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  voices: VoiceOption[];
  onVoiceChange: (characterId: string, voiceId: string) => void;
}

export interface ProviderSelectorProps {
  provider: VoiceProvider;
  onProviderChange: (provider: VoiceProvider, language: VoiceLanguage) => void;
}

export interface VoiceoverProgressProps {
  generatedCount: number;
  totalCount: number;
  isGeneratingAll: boolean;
  provider: VoiceProvider;
  onGenerateAll: () => void;
  onDownloadAll: () => void;
}

export interface DialogueLineCardProps {
  line: DialogueLine;
  character: Character | undefined;
  status: 'idle' | 'generating' | 'complete' | 'error';
  progress: number;
  isPlaying: boolean;
  provider: VoiceProvider;
  isReadOnly?: boolean;
  onTogglePlay: () => void;
  onGenerate: () => void;
  onAudioRef: (el: HTMLAudioElement | null) => void;
  onAudioEnded: () => void;
}

export interface SceneDialogueCardProps {
  scene: {
    id: string;
    title: string;
    number: number;
    dialogue: DialogueLine[];
  };
  sceneIndex: number;
  characters: Character[];
  audioStates: AudioState;
  playingAudio: string | null;
  provider: VoiceProvider;
  isReadOnly?: boolean;
  onTogglePlay: (lineId: string) => void;
  onGenerateAudio: (lineId: string, sceneId: string) => void;
  onAudioRef: (lineId: string, el: HTMLAudioElement | null) => void;
  onAudioEnded: () => void;
}

export interface ProviderInfoProps {
  currentProvider: VoiceProvider;
}
