/**
 * Response parsers for different LLM providers
 */

interface ApiResponse {
  data?: any;
  provider: string;
}

/**
 * Extract text from OpenRouter/KIE response
 */
export function parseOpenRouterResponse(response: ApiResponse): string | undefined {
  let generatedText = response.data?.choices?.[0]?.message?.content;

  // Check KIE wrapped format
  if (!generatedText && response.data?.data) {
    const kieData = response.data.data;
    generatedText = kieData.choices?.[0]?.message?.content ||
      kieData.output ||
      kieData.text ||
      kieData.result ||
      kieData.response;
  }

  // Check for direct message property
  if (!generatedText && response.data?.message) {
    generatedText = response.data.message;
  }

  // Check if response itself is a string
  if (!generatedText && typeof response.data === 'string') {
    generatedText = response.data;
  }

  return generatedText;
}

/**
 * Extract text from Modal response
 */
export function parseModalResponse(response: ApiResponse): string | undefined {
  return response.data?.response ||
    response.data?.text ||
    response.data?.content ||
    (typeof response.data === 'string' ? response.data : undefined);
}

/**
 * Extract text from Gemini response
 */
export function parseGeminiResponse(response: ApiResponse): string | undefined {
  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

/**
 * Extract text from response based on provider
 */
export function extractGeneratedText(response: ApiResponse): string | undefined {
  switch (response.provider) {
    case 'openrouter':
    case 'kie':
      return parseOpenRouterResponse(response);

    case 'modal':
      return parseModalResponse(response);

    case 'gemini':
      return parseGeminiResponse(response);

    default:
      return undefined;
  }
}