/**
 * OpenRouter API Service
 *
 * OpenRouter provides access to multiple LLM models through a single API.
 * It uses an OpenAI-compatible API format, making it easy to integrate.
 *
 * This is the DEFAULT LLM provider as it works everywhere including:
 * - Local development
 * - Vercel deployments
 * - Any hosting platform
 *
 * Users only need an API key from https://openrouter.ai
 */

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Available models through OpenRouter
// Using Claude models for consistency with existing implementation
export const OPENROUTER_MODELS = {
  // Claude models (recommended for scene generation)
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3-sonnet': 'anthropic/claude-3-sonnet-20240229',
  'claude-3-opus': 'anthropic/claude-3-opus-20240229',
  'claude-3-haiku': 'anthropic/claude-3-haiku-20240307',
  // GPT models (alternatives)
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
} as const;

export type OpenRouterModelKey = keyof typeof OPENROUTER_MODELS;

// Default model for scene generation - Claude 3.5 Sonnet for best quality
export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODELS['claude-3.5-sonnet'];

/**
 * Call the OpenRouter API
 *
 * @param apiKey - OpenRouter API key
 * @param systemPrompt - System prompt for the model
 * @param userPrompt - User prompt/message
 * @param model - Model to use (defaults to Claude 3.5 Sonnet)
 * @param maxTokens - Maximum tokens to generate
 * @returns The model's response text
 */
export async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_OPENROUTER_MODEL,
  maxTokens: number = 8192
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://film-generator.vercel.app',
      'X-Title': 'Film Generator',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    } as OpenRouterRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`OpenRouter API error: ${errorMessage}`);
  }

  const data: OpenRouterResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenRouter');
  }

  return data.choices[0].message.content;
}

/**
 * Streaming version of OpenRouter API call
 *
 * @param apiKey - OpenRouter API key
 * @param systemPrompt - System prompt for the model
 * @param userPrompt - User prompt/message
 * @param model - Model to use (defaults to Claude 3.5 Sonnet)
 * @param maxTokens - Maximum tokens to generate
 * @returns AsyncIterable of response chunks
 */
export async function* streamOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_OPENROUTER_MODEL,
  maxTokens: number = 8192
): AsyncIterable<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://film-generator.vercel.app',
      'X-Title': 'Film Generator',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    } as OpenRouterRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`OpenRouter API error: ${errorMessage}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }
}

/**
 * Validate an OpenRouter API key
 *
 * @param apiKey - API key to validate
 * @returns true if valid, false otherwise
 */
export async function validateOpenRouterKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
