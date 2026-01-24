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

import { getProviderConfig } from '../provider-config';
import type { GenerationType } from '../types';
import { getProviderHeaders } from '@/lib/constants/api-endpoints';
import { buildProviderUrl } from './url-builder';
import { extractErrorMessage } from './error-handler';
import { callClaudeSDK } from './claude-sdk';

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