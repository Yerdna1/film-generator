export interface StoryData {
  concept: string;
  title?: string;
  genre?: string;
  tone?: string;
  setting?: string;
}

export interface Character {
  id: string;
  name: string;
  masterPrompt?: string;
  description?: string;
}

export interface SceneGenerationData {
  projectId: string;
  userId: string;
  jobId: string;
  story: StoryData;
  characters: Character[];
  style: string;
  sceneCount: number;
  skipCreditCheck?: boolean;
}

export interface LLMConfig {
  provider: 'openrouter' | 'gemini' | 'claude-sdk' | 'modal' | 'kie';
  model: string;
  endpoint?: string;
}

export interface Scene {
  number: number;
  title?: string;
  cameraShot?: string;
  textToImagePrompt?: string;
  imageToVideoPrompt?: string;
  dialogue?: Array<{ characterName?: string; text?: string }>;
}

export interface SceneGenerationResult {
  success: boolean;
  sceneCount?: number;
  batches?: number;
  error?: string;
}

export interface LLMProviderSettings {
  openRouterApiKey?: string | null;
  modalLlmEndpoint?: string | null;
  openRouterModel?: string | null;
  llmProvider?: string | null;
  kieApiKey?: string | null;
  kieLlmModel?: string | null;
}

export interface BatchGenerationResult {
  success: boolean;
  scenes?: Scene[];
  error?: string;
}
