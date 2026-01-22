import { callExternalApi } from '@/lib/providers/api-wrapper';
import type { LLMConfig, LLMProviderSettings, BatchGenerationResult } from './types';
import { getStoryModelMapping, SUPPORTED_FREE_OPENROUTER_MODELS, DEFAULT_STORY_MODEL } from './constants';
import { SYSTEM_PROMPT } from './constants';

export interface LLMParseResult {
  llmConfig: LLMConfig;
  llmProvider: LLMConfig['provider'];
  llmModel: string;
}

export function parseLLMConfig(options: {
  storyModel: string;
  userSettings: LLMProviderSettings | null;
  envOpenRouterKey?: string;
}): LLMParseResult {
  const { storyModel, userSettings, envOpenRouterKey } = options;

  const openRouterApiKey = userSettings?.openRouterApiKey || envOpenRouterKey;
  const userSelectedOpenRouterModel = userSettings?.openRouterModel;

  const storyModelMapping = getStoryModelMapping(storyModel, !!openRouterApiKey);
  let llmConfig = storyModelMapping[storyModel] || storyModelMapping[DEFAULT_STORY_MODEL];
  let llmProvider = llmConfig.provider;
  let llmModel = llmConfig.model;

  // If user has their own OpenRouter key and selected a specific model, use it
  if (openRouterApiKey && userSelectedOpenRouterModel) {
    if (SUPPORTED_FREE_OPENROUTER_MODELS.includes(userSelectedOpenRouterModel as any)) {
      llmProvider = 'openrouter';
      llmModel = userSelectedOpenRouterModel;
      console.log(`[Inngest Scenes] Using user-selected FREE OpenRouter model: ${llmModel}`);
    } else {
      console.warn(`[Inngest Scenes] Unknown user-selected model: ${userSelectedOpenRouterModel}, falling back to default`);
    }
  }

  return { llmConfig, llmProvider, llmModel };
}

export async function callLLM(options: {
  llmProvider: LLMConfig['provider'];
  llmModel: string;
  prompt: string;
  userSettings: LLMProviderSettings | null;
  envOpenRouterKey?: string;
}): Promise<{ fullResponse: string; error?: string }> {
  const { llmProvider, llmModel, prompt, userSettings, envOpenRouterKey } = options;

  const openRouterApiKey = userSettings?.openRouterApiKey || envOpenRouterKey;
  const modalLlmEndpoint = userSettings?.modalLlmEndpoint;

  let fullResponse = '';

  if (llmProvider === 'modal' && modalLlmEndpoint) {
    const response = await fetch(modalLlmEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        system_prompt: SYSTEM_PROMPT,
        max_tokens: 16384,
      }),
    });

    if (!response.ok) {
      throw new Error(`Modal LLM failed: ${await response.text()}`);
    }

    const data = await response.json();
    fullResponse = data.response || data.text || data.content || '';
  } else if (llmProvider === 'claude-sdk') {
    fullResponse = await callClaudeSDK(prompt, SYSTEM_PROMPT);
  } else if (openRouterApiKey) {
    try {
      // Use the new API wrapper instead of deprecated service
      const response = await callExternalApi({
        userId: 'system', // This is a system call without user context
        type: 'llm',
        body: {
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          model: llmModel,
          max_tokens: 16384
        },
        showLoadingMessage: false
      });

      if (response.error) {
        throw new Error(response.error);
      }

      fullResponse = response.data.choices?.[0]?.message?.content || '';
    } catch (openRouterError: any) {
      // Check if it's an insufficient credits error
      if (openRouterError.message?.includes('Insufficient credits')) {
        return { fullResponse: '', error: 'Insufficient credits. Please add credits at openrouter.ai.' };
      }
      throw openRouterError;
    }
  } else {
    throw new Error('No LLM provider available');
  }

  return { fullResponse };
}

async function callClaudeSDK(prompt: string, systemPrompt: string): Promise<string> {
  const { spawnSync } = await import('child_process');
  const fs = await import('fs');
  const os = await import('os');
  const path = await import('path');

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  // Write prompt to temp file to avoid stdin issues
  const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, fullPrompt, 'utf-8');

  // Full path to claude CLI (nvm installation)
  const claudePath = '/Users/andrejpt/.nvm/versions/node/v22.21.1/bin/claude';

  try {
    // Build env without ANTHROPIC_API_KEY so CLI uses OAuth instead
    const cleanEnv = { ...process.env };
    delete cleanEnv.ANTHROPIC_API_KEY; // Remove so CLI uses OAuth session

    // Call claude CLI with --print for non-interactive output
    const result = spawnSync(claudePath, ['-p', '--output-format', 'text'], {
      input: fullPrompt,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
      timeout: 300000, // 5 minute timeout
      env: {
        ...cleanEnv,
        PATH: process.env.PATH + ':/Users/andrejpt/.nvm/versions/node/v22.21.1/bin',
        HOME: '/Users/andrejpt',
        USER: 'andrejpt',
      },
      cwd: '/Volumes/DATA/Python/film-generator',
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      console.error('[Claude CLI] stderr:', result.stderr);
      console.error('[Claude CLI] stdout:', result.stdout?.slice(0, 500));
      console.error('[Claude CLI] signal:', result.signal);
      throw new Error(`Claude CLI exited with code ${result.status}. stderr: ${result.stderr}. stdout: ${result.stdout?.slice(0, 200)}`);
    }

    return result.stdout;
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch { }
  }
}

export function validateLLMProviderSettings(
  llmProvider: LLMConfig['provider'],
  userSettings: LLMProviderSettings | null,
  envOpenRouterKey?: string
): { valid: boolean; error?: string } {
  const openRouterApiKey = userSettings?.openRouterApiKey || envOpenRouterKey;
  const modalLlmEndpoint = userSettings?.modalLlmEndpoint;

  if (llmProvider === 'openrouter' && !openRouterApiKey) {
    return { valid: false, error: 'OpenRouter API key not configured' };
  }

  if (llmProvider === 'modal' && !modalLlmEndpoint) {
    return { valid: false, error: 'Modal LLM endpoint not configured' };
  }

  return { valid: true };
}
