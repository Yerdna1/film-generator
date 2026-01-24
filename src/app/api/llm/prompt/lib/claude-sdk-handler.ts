/**
 * Claude SDK handler for local development
 */

import type { ProviderConfig } from '@/lib/providers';
import { spendCredits, COSTS } from '@/lib/services/credits';
import type { Provider } from '@/lib/services/real-costs';

interface ClaudeSDKOptions {
  config: ProviderConfig;
  prompt: string;
  systemPrompt: string;
  userId: string;
  projectId?: string;
  shouldChargeCredits: boolean;
}

/**
 * Handle Claude SDK requests (local development only)
 */
export async function handleClaudeSDK(options: ClaudeSDKOptions) {
  const { config, prompt, systemPrompt, userId, projectId, shouldChargeCredits } = options;

  if (config.provider !== 'claude-sdk') {
    return null;
  }

  try {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    let fullResponse = '';

    const stream = query({
      prompt,
      options: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: systemPrompt,
        maxTurns: 1,
        allowedTools: [],
      },
    });

    for await (const message of stream) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
          }
        }
      }
    }

    // Deduct credits if needed
    if (shouldChargeCredits) {
      await spendCredits(
        userId,
        COSTS.SCENE_GENERATION,
        'prompt',
        'Master prompt enhancement via Claude SDK',
        projectId,
        'claude-sdk' as Provider
      );
    }

    return {
      text: fullResponse,
      provider: 'claude-sdk',
      creditsUsed: shouldChargeCredits ? COSTS.SCENE_GENERATION : 0,
      isFreeGeneration: !shouldChargeCredits
    };
  } catch (error) {
    throw new Error(
      `Claude SDK error: ${error instanceof Error ? error.message : String(error)}. ` +
      'Make sure Claude CLI is installed and authenticated.'
    );
  }
}