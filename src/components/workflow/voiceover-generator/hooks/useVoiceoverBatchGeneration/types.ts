import type { DialogueLineWithScene } from '../../types';

export interface VoiceoverGenerationJob {
  id: string;
  status: string;
  totalAudioLines: number;
  completedAudioLines: number;
  failedAudioLines: number;
  progress: number;
  errorDetails?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  audioProvider?: string;
  audioModel?: string;
}

export type GeneratingAudioState = {
  [lineId: string]: boolean;
};

export interface AudioLineRequest {
  lineId: string;
  sceneId: string;
  sceneNumber: number;
  text: string;
  characterId: string;
  voiceId: string;
}

export interface VoiceoverGenerationOptions {
  projectId: string;
  audioLines: AudioLineRequest[];
  language: string;
}

export interface VoiceoverGenerationResult {
  success: boolean;
  jobId?: string;
  error?: string;
}
