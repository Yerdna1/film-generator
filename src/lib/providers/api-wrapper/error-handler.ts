/**
 * Error handling utilities for API responses
 */

/**
 * Extract user-friendly error message from API response
 */
export function extractErrorMessage(
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