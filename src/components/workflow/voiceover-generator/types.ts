import type { Project, Character, DialogueLine, VoiceProvider, VoiceLanguage } from '@/types/project';
import type { ProjectPermissions, ProjectRole, RegenerationRequest } from '@/types/collaboration';
import { ItemGenerationState } from '@/lib/constants/workflow';

export interface Step5Props {
  project: Project;
  permissions?: ProjectPermissions | null;
  userRole?: ProjectRole | null;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
}

export type AudioState = Record<string, ItemGenerationState>;

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender?: 'male' | 'female' | 'neutral' | 'child';
}

// ElevenLabs voices with real API IDs
export const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, young, American female', gender: 'female' },
  { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew', description: 'Well-rounded, American male', gender: 'male' },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', description: 'War veteran, American male', gender: 'male' },
  { id: '5Q0t7uMcjvnagumLfvZi', name: 'Paul', description: 'Ground reporter, American male', gender: 'male' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong, young, American female', gender: 'female' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', description: 'British, conversational male', gender: 'male' },
  { id: 'D38z5RcWu1voky8WS1ja', name: 'Fin', description: 'Irish, sailing male', gender: 'male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft, young, American female', gender: 'female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded, young, American male', gender: 'male' },
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', description: 'Calm, young, American male', gender: 'male' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual, Australian male', gender: 'male' },
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily', description: 'Calm, young, American female', gender: 'female' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, American male', gender: 'male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'British, authoritative male', gender: 'male' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Seductive, Swedish female', gender: 'female' },
];

// Gemini TTS voices (supports Slovak and other languages)
export const GEMINI_VOICES: VoiceOption[] = [
  { id: 'Aoede', name: 'Aoede', description: 'Natural female voice', gender: 'female' },
  { id: 'Charon', name: 'Charon', description: 'Deep male voice', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Young male voice', gender: 'male' },
  { id: 'Kore', name: 'Kore', description: 'Soft female voice', gender: 'female' },
  { id: 'Puck', name: 'Puck', description: 'Playful voice', gender: 'child' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Gentle voice', gender: 'neutral' },
  { id: 'Enceladus', name: 'Enceladus', description: 'Clear male voice', gender: 'male' },
  { id: 'Iapetus', name: 'Iapetus', description: 'Warm male voice', gender: 'male' },
];

// OpenAI TTS voices (gpt-4o-mini-tts model with voice instructions support)
export const OPENAI_VOICES: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice', gender: 'neutral' },
  { id: 'ash', name: 'Ash', description: 'Warm, expressive male', gender: 'male' },
  { id: 'ballad', name: 'Ballad', description: 'Storytelling male', gender: 'male' },
  { id: 'coral', name: 'Coral', description: 'Friendly, energetic female', gender: 'female' },
  { id: 'echo', name: 'Echo', description: 'Clear, refined male', gender: 'male' },
  { id: 'fable', name: 'Fable', description: 'British, expressive female', gender: 'female' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative male', gender: 'male' },
  { id: 'nova', name: 'Nova', description: 'Warm, conversational female', gender: 'female' },
  { id: 'sage', name: 'Sage', description: 'Calm, reassuring female', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', description: 'Light, theatrical female', gender: 'female' },
  { id: 'verse', name: 'Verse', description: 'Mellow, laid-back male', gender: 'male' },
];

// KIE AI TTS voices - KIE accepts specific voice names from ElevenLabs
// These are the only voices supported by KIE's ElevenLabs models
export const KIE_VOICES: VoiceOption[] = [
  { id: 'Rachel', name: 'Rachel', description: 'Calm, young, American female', gender: 'female' },
  { id: 'Aria', name: 'Aria', description: 'Expressive, American female', gender: 'female' },
  { id: 'Roger', name: 'Roger', description: 'American male', gender: 'male' },
  { id: 'Sarah', name: 'Sarah', description: 'Soft, young, American female', gender: 'female' },
  { id: 'Laura', name: 'Laura', description: 'American female', gender: 'female' },
  { id: 'Charlie', name: 'Charlie', description: 'Australian male', gender: 'male' },
  { id: 'George', name: 'George', description: 'American male', gender: 'male' },
  { id: 'Callum', name: 'Callum', description: 'British male', gender: 'male' },
  { id: 'River', name: 'River', description: 'American female', gender: 'female' },
  { id: 'Liam', name: 'Liam', description: 'Irish male', gender: 'male' },
  { id: 'Charlotte', name: 'Charlotte', description: 'Swedish female', gender: 'female' },
  { id: 'Alice', name: 'Alice', description: 'American female', gender: 'female' },
  { id: 'Matilda', name: 'Matilda', description: 'American female', gender: 'female' },
  { id: 'Will', name: 'Will', description: 'American male', gender: 'male' },
  { id: 'Jessica', name: 'Jessica', description: 'American female', gender: 'female' },
  { id: 'Eric', name: 'Eric', description: 'British male', gender: 'male' },
  { id: 'Chris', name: 'Chris', description: 'American male', gender: 'male' },
  { id: 'Brian', name: 'Brian', description: 'American male', gender: 'male' },
  { id: 'Daniel', name: 'Daniel', description: 'British male', gender: 'male' },
  { id: 'Lily', name: 'Lily', description: 'American female', gender: 'female' },
  { id: 'Bill', name: 'Bill', description: 'American male', gender: 'male' },
];

// Map ElevenLabs voice IDs to KIE voice names
// Maps our ELEVENLABS_VOICES to the closest KIE voice
export const ELEVENLABS_TO_KIE_VOICE_MAP: Record<string, string> = {
  // Direct name matches
  '21m00Tcm4TlvDq8ikWAM': 'Rachel', // Rachel → Rachel
  'EXAVITQu4vr4xnSDxMaL': 'Sarah',   // Sarah → Sarah
  'IKne3meq5aSn9XLyUdCD': 'Charlie', // Charlie → Charlie
  'XB0fDUnXU5powFXDhCwa': 'Charlotte', // Charlotte → Charlotte
  'onwK4e9ZLuTAKqWW03F9': 'Daniel',  // Daniel → Daniel

  // Close matches by gender and accent
  'LcfcDJNUP1GQjkzn1xUU': 'Laura',   // Emily → Laura (American female)
  'AZnzlk1XvdvUeBnXmlld': 'Aria',    // Domi → Aria (American female)
  '29vD33N1CtxCmqQRPOHJ': 'Roger',   // Drew → Roger (American male)
  'pNInz6obpgDQGcFmaJgB': 'George',  // Adam → George (American male)
  '2EiwWnXFnvU5JabPnv8n': 'Bill',    // Clyde → Bill (American male)
  '5Q0t7uMcjvnagumLfvZi': 'Chris',   // Paul → Chris (American male)
  'CYw3kZ02Hs0563khs1Fj': 'Eric',    // Dave → Eric (British male)
  'D38z5RcWu1voky8WS1ja': 'Liam',    // Fin → Liam (Irish male)
  'ErXwobaYiN019PkySvjV': 'Will',    // Antoni → Will (American male)
  'GBv7mTt0atIp3Br8iCZE': 'Brian',   // Thomas → Brian (American male)
};

// Convert ElevenLabs voice ID to KIE voice name
export const getKieVoiceName = (elevenLabsVoiceId: string): string => {
  return ELEVENLABS_TO_KIE_VOICE_MAP[elevenLabsVoiceId] || 'Rachel'; // Default to Rachel
};

// Helper to get a valid voice ID for the current provider
// Returns null if no valid voice is configured for this provider
export const getVoiceForProvider = (
  voiceId: string | undefined,
  provider: 'gemini-tts' | 'elevenlabs' | 'openai-tts' | 'modal' | 'kie'
): string | null => {
  if (!voiceId) return null;

  // Check if voiceId is valid for the current provider
  if (provider === 'gemini-tts' && GEMINI_VOICES.some(v => v.id.toLowerCase() === voiceId.toLowerCase())) {
    return GEMINI_VOICES.find(v => v.id.toLowerCase() === voiceId.toLowerCase())?.id || null;
  }
  if (provider === 'elevenlabs' && ELEVENLABS_VOICES.some(v => v.id === voiceId)) {
    return voiceId;
  }
  if (provider === 'openai-tts' && OPENAI_VOICES.some(v => v.id === voiceId)) {
    return voiceId;
  }
  if (provider === 'modal') {
    // Modal accepts any voice name
    return voiceId;
  }
  if (provider === 'kie') {
    // KIE requires specific voice names
    // If voiceId is already a KIE voice name, use it directly
    if (KIE_VOICES.some(v => v.id === voiceId)) {
      return voiceId;
    }
    // If voiceId is an ElevenLabs ID, convert it to KIE voice name
    if (ELEVENLABS_TO_KIE_VOICE_MAP[voiceId]) {
      return ELEVENLABS_TO_KIE_VOICE_MAP[voiceId];
    }
    // Default to Rachel if unknown
    return 'Rachel';
  }

  return null;
};

// Get provider display name for error messages
export const getProviderDisplayName = (provider: string): string => {
  const names: Record<string, string> = {
    'gemini-tts': 'Gemini TTS',
    'elevenlabs': 'ElevenLabs',
    'openai-tts': 'OpenAI TTS',
    'modal': 'Modal TTS',
    'kie': 'Kie.ai TTS',
  };
  return names[provider] || provider;
};

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
  switch (provider) {
    case 'gemini-tts':
      return GEMINI_VOICES;
    case 'elevenlabs':
      return ELEVENLABS_VOICES;
    case 'openai-tts':
      return OPENAI_VOICES;
    case 'kie':
      // KIE TTS uses KIE voice names (Rachel, George, Laura, etc.)
      return KIE_VOICES;
    default:
      return GEMINI_VOICES;
  }
};

export interface DialogueLineWithScene extends DialogueLine {
  sceneId: string;
  sceneTitle: string;
  sceneNumber: number;
}

export interface VoiceSettings {
  voiceInstructions?: string;
  voiceStability?: number;
  voiceSimilarityBoost?: number;
  voiceStyle?: number;
}

export interface VoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  voices: VoiceOption[];
  provider: VoiceProvider;
  onVoiceChange: (characterId: string, voiceId: string) => void;
  onVoiceSettingsChange: (characterId: string, settings: VoiceSettings) => void;
}

export interface ProviderSelectorProps {
  provider: VoiceProvider;
  onProviderChange: (provider: VoiceProvider, language: VoiceLanguage) => void;
}

export interface VersionInfo {
  provider: string;
  language: string;
  count: number;
}

export interface VoiceoverProgressProps {
  generatedCount: number;
  totalCount: number;
  remainingCount: number;
  totalCharacters: number;
  isGeneratingAll: boolean;
  isPlayingAll: boolean;
  provider: VoiceProvider;
  language: VoiceLanguage;
  availableVersions: VersionInfo[];
  onGenerateAll: () => void;
  onDownloadAll: () => void;
  onDeleteAll: () => void;
  onPlayAll: () => void;
  onStopPlayback: () => void;
  onSwitchAllToProvider: (provider: VoiceProvider, language: VoiceLanguage) => void;
}

export interface DialogueLineCardProps {
  line: DialogueLine;
  character: Character | undefined;
  status: 'idle' | 'generating' | 'complete' | 'error';
  progress: number;
  error?: string;
  isPlaying: boolean;
  provider: VoiceProvider;
  projectId: string;
  sceneId: string;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
  isFirstDialogue?: boolean;
  canDeleteDirectly?: boolean;
  hasPendingRegeneration?: boolean;
  hasPendingDeletion?: boolean;
  approvedRegeneration?: RegenerationRequest | null;
  onTogglePlay: () => void;
  onGenerate: () => void;
  onAudioRef: (el: HTMLAudioElement | null) => void;
  onAudioEnded: () => void;
  onDownload?: () => void;
  onDeleteAudio?: () => void;
  onSelectVersion?: (audioUrl: string, provider: string) => void;
  onDeletionRequested?: () => void;
  onUseRegenerationAttempt?: (requestId: string) => Promise<void>;
  onSelectRegeneration?: (requestId: string, selectedUrl: string) => Promise<void>;
}

export interface SceneDialogueCardProps {
  scene: {
    id: string;
    title: string;
    number: number;
    dialogue: DialogueLine[];
    useTtsInVideo?: boolean;
  };
  sceneIndex: number;
  projectId: string;
  characters: Character[];
  audioStates: AudioState;
  playingAudio: string | null;
  playingSceneId: string | null;
  provider: VoiceProvider;
  isReadOnly?: boolean;
  isAuthenticated?: boolean;
  firstDialogueLineId?: string | null;
  canDeleteDirectly?: boolean;
  pendingRegenLineIds?: Set<string>;
  pendingDeletionLineIds?: Set<string>;
  approvedRegenByLineId?: Map<string, RegenerationRequest>;
  onTogglePlay: (lineId: string) => void;
  onGenerateAudio: (lineId: string, sceneId: string) => void;
  onAudioRef: (lineId: string, el: HTMLAudioElement | null) => void;
  onAudioEnded: () => void;
  onDownloadLine?: (lineId: string) => void;
  onDeleteAudio?: (lineId: string, sceneId: string) => void;
  onSelectVersion?: (lineId: string, sceneId: string, audioUrl: string, provider: string) => void;
  onPlayAllScene?: (sceneId: string) => void;
  onStopScenePlayback?: () => void;
  onToggleUseTts?: (sceneId: string) => void;
  onDeletionRequested?: () => void;
  onUseRegenerationAttempt?: (requestId: string) => Promise<void>;
  onSelectRegeneration?: (requestId: string, selectedUrl: string) => Promise<void>;
}

export interface ProviderInfoProps {
  currentProvider: VoiceProvider;
}
