import { spendCredits, COSTS } from '@/lib/services/credits';
import { ACTION_COSTS } from '@/lib/services/real-costs';
import type { LLMConfig } from './types';

export async function spendSceneCredits(options: {
  userId: string;
  sceneCount: number;
  llmProvider: LLMConfig['provider'];
  storyModel: string;
  projectId: string;
  totalBatches: number;
}): Promise<void> {
  const { userId, sceneCount, llmProvider, storyModel, projectId, totalBatches } = options;

  // Map llmProvider to credit provider name
  const creditProvider: Parameters<typeof spendCredits>[5] = llmProvider === 'gemini' ? 'gemini' :
    llmProvider === 'modal' ? 'modal' :
      llmProvider === 'claude-sdk' ? 'claude-sdk' :
        llmProvider === 'openrouter' ? 'openrouter' :
          undefined; // Fallback for unknown providers

  // Calculate real cost based on provider and model
  let realCost: number;
  if (llmProvider === 'modal') {
    realCost = ACTION_COSTS.scene.modal * sceneCount; // ~$0.002 per scene
  } else if (llmProvider === 'claude-sdk') {
    realCost = ACTION_COSTS.scene.claude * sceneCount; // Same as Claude API (~$0.01 per scene)
  } else if (llmProvider === 'openrouter') {
    // OpenRouter pricing varies by model
    if (storyModel === 'gpt-4') {
      realCost = ACTION_COSTS.scene.claude * sceneCount; // GPT-4 Turbo similar to Claude
    } else if (storyModel === 'claude-sonnet-4.5') {
      realCost = ACTION_COSTS.scene.claude * sceneCount; // Claude Sonnet 4.5 via OpenRouter
    } else if (storyModel === 'gemini-3-pro') {
      realCost = ACTION_COSTS.scene.gemini * sceneCount; // Gemini Flash is cheaper
    } else {
      realCost = ACTION_COSTS.scene.claude * sceneCount; // Default fallback
    }
  } else {
    // Default for gemini and others
    realCost = ACTION_COSTS.scene.gemini * sceneCount;
  }

  await spendCredits(
    userId,
    COSTS.SCENE_GENERATION * sceneCount,
    'scene',
    `${storyModel} scene generation (${sceneCount} scenes in ${totalBatches} batches)`,
    projectId,
    creditProvider,
    undefined,
    realCost
  );
}
