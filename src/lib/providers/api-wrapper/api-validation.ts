/**
 * API key validation utilities
 */

import { getEndpointUrl, getProviderHeaders } from '@/lib/constants/api-endpoints';

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