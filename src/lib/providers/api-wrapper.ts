/**
 * Centralized API Wrapper for External Service Calls
 *
 * This wrapper ensures:
 * - All API calls use the provider configuration as single source of truth
 * - No hardcoded API endpoints or models
 * - Consistent error handling and logging
 * - Loading state management
 * - Proper authentication headers
 */

import { getProviderConfig } from './provider-config';
import type { GenerationType } from './types';
import { prisma } from '@/lib/db/prisma';
import { getEndpointUrl, getProviderHeaders, buildApiUrl } from '@/lib/constants/api-endpoints';

export interface ApiCallOptions {
  userId: string;
  projectId?: string;
  type: GenerationType;
  endpoint?: string; // For custom/modal endpoints
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  showLoadingMessage?: boolean;
  loadingMessage?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  provider: string;
  model?: string;
}

/**
 * Make an API call to an external service
 * Uses provider configuration as single source of truth
 */
export async function callExternalApi<T = any>(
  options: ApiCallOptions
): Promise<ApiResponse<T>> {
  const {
    userId,
    projectId,
    type,
    endpoint: customEndpoint,
    method = 'POST',
    body,
    headers: customHeaders = {},
    timeout = 120000, // 2 minutes default
    showLoadingMessage = true,
    loadingMessage = 'Processing request...',
  } = options;

  try {
    // Get provider configuration - single source of truth
    const config = await getProviderConfig({
      userId,
      projectId,
      type,
    });

    const { provider, apiKey, model, endpoint: modalEndpoint } = config;

    // Log the API call for debugging
    console.log(`[API Wrapper] Calling ${provider} API:`, {
      type,
      provider,
      model,
      hasApiKey: !!apiKey,
      hasModalEndpoint: !!modalEndpoint,
      projectId,
    });

    // Validate configuration
    if (!provider) {
      throw new Error(`No provider configured for ${type}`);
    }

    // Build the request URL based on provider
    let url: string;

    if (customEndpoint) {
      // Use custom endpoint if provided
      url = customEndpoint;
    } else if (provider === 'modal' && modalEndpoint) {
      // Use Modal endpoint from configuration
      url = modalEndpoint;
    } else {
      // Build URL based on provider and type
      url = buildProviderUrl(provider, type, model);
    }

    // Build headers using centralized configuration
    const headers = getProviderHeaders(provider, undefined, customHeaders);

    // Special case for claude-sdk - use local CLI instead of HTTP
    if (provider === 'claude-sdk') {
      try {
        // Extract messages from body to build prompt
        const messages = body?.messages || [];
        const systemMessage = messages.find((m: any) => m.role === 'system')?.content || '';
        const userMessage = messages.find((m: any) => m.role === 'user')?.content || '';
        const fullPrompt = systemMessage ? `${systemMessage}\n\n${userMessage}` : userMessage;

        // Call Claude SDK CLI
        const response = await callClaudeSDK(fullPrompt);

        return {
          data: {
            choices: [{
              message: { content: response },
              finish_reason: 'stop'
            }]
          } as T,
          status: 200,
          provider,
          model: 'claude-sdk',
        };
      } catch (error: any) {
        return {
          error: error.message || 'Claude SDK call failed',
          status: 500,
          provider,
          model: 'claude-sdk',
        };
      }
    }

    // Add authentication based on provider
    if (provider === 'gemini') {
      // Gemini uses API key in URL, not header
      if (!apiKey) {
        throw new Error('Gemini API key required');
      }
      url = `${url}?key=${apiKey}`;
    } else if (apiKey) {
      // Other providers use Bearer token
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider !== 'modal') {
      // Modal uses custom endpoints without API keys
      throw new Error(`API key required for ${provider}`);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Show loading message if requested
    if (showLoadingMessage) {
      console.log(`[API Wrapper] ${loadingMessage}`);
    }

    // Make the API call
    console.log(`[API Wrapper] Sending ${provider} ${type} request:`, {
      url,
      method,
      headers: Object.keys(headers).reduce((acc, key) => {
        acc[key] = key.toLowerCase().includes('auth') || key.toLowerCase().includes('key')
          ? '[REDACTED]'
          : headers[key];
        return acc;
      }, {} as Record<string, string>),
      bodyPreview: body ? JSON.stringify(body).slice(0, 300) : 'no body',
    });
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response
    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = extractErrorMessage(responseData, response.status, provider);
      console.error(`[API Wrapper] ${provider} API error:`, {
        status: response.status,
        error: errorMessage,
        response: responseData,
      });

      return {
        error: errorMessage,
        status: response.status,
        provider,
        model,
      };
    }

    console.log(`[API Wrapper] ${provider} ${type} response received:`, {
      status: response.status,
      hasData: !!responseData,
      dataKeys: responseData ? Object.keys(responseData).slice(0, 10) : [],
      dataPreview: responseData ? JSON.stringify(responseData).slice(0, 500) : null,
    });

    return {
      data: responseData,
      status: response.status,
      provider,
      model,
    };
  } catch (error) {
    console.error('[API Wrapper] Request failed:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          error: 'Request timeout - operation took too long',
          status: 408,
          provider: 'unknown',
        };
      }

      return {
        error: error.message,
        status: 500,
        provider: 'unknown',
      };
    }

    return {
      error: 'Unknown error occurred',
      status: 500,
      provider: 'unknown',
    };
  }
}

/**
 * Build the API URL based on provider and type
 */
function buildProviderUrl(provider: string, type: GenerationType, model?: string): string {
  switch (type) {
    case 'llm':
      switch (provider) {
        case 'openrouter':
          return getEndpointUrl('openrouter', 'chat');
        case 'kie':
          return getEndpointUrl('kie', 'llm');
        case 'gemini':
          return getEndpointUrl('gemini', 'generateContent', model || 'gemini-2.0-flash-exp');
        case 'openai':
          return getEndpointUrl('openai', 'chat');
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }

    case 'image':
      switch (provider) {
        case 'kie':
          return getEndpointUrl('kie', 'generateImage');
        case 'gemini':
          return getEndpointUrl('gemini', 'generateContent', model || 'gemini-3-pro-image-preview');
        case 'grok':
          return getEndpointUrl('grok', 'images');
        default:
          throw new Error(`Unsupported image provider: ${provider}`);
      }

    case 'video':
      switch (provider) {
        case 'kie':
          return getEndpointUrl('kie', 'createTask');
        default:
          throw new Error(`Unsupported video provider: ${provider}`);
      }

    case 'tts':
      switch (provider) {
        case 'openai':
          return getEndpointUrl('openai', 'tts');
        case 'elevenlabs':
          if (!model) throw new Error('Voice ID required for ElevenLabs');
          return getEndpointUrl('elevenlabs', 'tts', model);
        case 'kie':
          return getEndpointUrl('kie', 'createTask');
        case 'gemini':
          return getEndpointUrl('gemini', 'generateContent', model || 'gemini-2.0-flash-exp');
        default:
          throw new Error(`Unsupported TTS provider: ${provider}`);
      }

    case 'music':
      switch (provider) {
        case 'kie':
          return getEndpointUrl('kie', 'generateMusic');
        default:
          throw new Error(`Unsupported music provider: ${provider}`);
      }

    default:
      throw new Error(`Unsupported generation type: ${type}`);
  }
}

/**
 * Call Claude SDK CLI for local LLM access
 */
async function callClaudeSDK(prompt: string): Promise<string> {
  const { spawnSync } = await import('child_process');
  const fs = await import('fs');
  const os = await import('os');
  const path = await import('path');

  // Write prompt to temp file to avoid stdin issues
  const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  // Full path to claude CLI (nvm installation)
  const claudePath = '/Users/andrejpt/.nvm/versions/node/v22.21.1/bin/claude';

  try {
    // Build env without ANTHROPIC_API_KEY so CLI uses OAuth instead
    const cleanEnv = { ...process.env };
    delete cleanEnv.ANTHROPIC_API_KEY; // Remove so CLI uses OAuth session

    // Call claude CLI with --print for non-interactive output
    const result = spawnSync(claudePath, ['-p', '--output-format', 'text'], {
      input: prompt,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
      timeout: 300000, // 5 minute timeout
      env: {
        ...cleanEnv,
        PATH: process.env.PATH + ':/Users/andrejpt/.nvm/versions/node/v22.21.1/bin',
        HOME: '/Users/andrejpt',
        USER: 'andrejpt',
      },
      cwd: '/Volumes/DATA/Python/artflowly_film-generator',
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

/**
 * Extract user-friendly error message from API response
 */
function extractErrorMessage(
  data: any,
  status: number,
  provider: string
): string {
  // Provider-specific error extraction
  switch (provider) {
    case 'openrouter':
      return data?.error?.message || `OpenRouter API error (${status})`;

    case 'kie':
      return data?.msg || data?.message || data?.error || `KIE API error (${status})`;

    case 'gemini':
      return data?.error?.message || `Gemini API error (${status})`;

    case 'openai':
      return data?.error?.message || `OpenAI API error (${status})`;

    case 'elevenlabs':
      return data?.detail || data?.error?.message || `ElevenLabs API error (${status})`;

    case 'grok':
      return data?.error?.message || `Grok API error (${status})`;

    default:
      return data?.error || data?.message || `API error (${status})`;
  }
}

/**
 * Helper function for KIE task polling
 */
export async function pollKieTask(
  taskId: string,
  apiKey: string,
  maxPolls: number = 60,
  pollInterval: number = 2000
): Promise<any> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const statusUrl = `${getEndpointUrl('kie', 'taskStatus')}?taskId=${taskId}`;
    const headers = getProviderHeaders('kie', apiKey);

    const response = await fetch(statusUrl, {
      headers,
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      throw new Error(data.msg || data.message || 'Failed to check KIE task status');
    }

    const taskData = data.data;
    const state = taskData?.state;

    if (state === 'success') {
      return taskData;
    } else if (state === 'fail') {
      const failReason = taskData?.fail_reason || taskData?.resultJson?.error || 'Unknown error';
      throw new Error(`KIE task failed: ${failReason}`);
    } else if (state !== 'waiting' && state !== 'queuing' && state !== 'generating') {
      throw new Error(`Unknown KIE task state: ${state}`);
    }
  }

  throw new Error('KIE task timed out');
}

/**
 * Validate API key for a provider
 */
export async function validateApiKey(
  provider: string,
  apiKey: string
): Promise<boolean> {
  try {
    switch (provider) {
      case 'openrouter':
        const response = await fetch(getEndpointUrl('openrouter', 'auth'), {
          method: 'GET',
          headers: getProviderHeaders('openrouter', apiKey),
        });
        return response.ok;

      case 'kie':
        // KIE doesn't have a dedicated auth endpoint, try a simple request
        const kieResponse = await fetch(getEndpointUrl('kie', 'models'), {
          headers: getProviderHeaders('kie', apiKey),
        });
        return kieResponse.ok;

      case 'gemini':
        // Try a simple generation with minimal tokens
        const geminiUrl = `${getEndpointUrl('gemini', 'generateContent', 'gemini-2.0-flash-exp')}?key=${apiKey}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: getProviderHeaders('gemini'),
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        });
        return geminiResponse.ok;

      default:
        // For other providers, assume valid if key exists
        return !!apiKey;
    }
  } catch {
    return false;
  }
}