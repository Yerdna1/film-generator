/**
 * Request body builders for different LLM providers
 */

interface BuildRequestOptions {
  provider: string;
  model?: string;
  prompt: string;
  systemPrompt: string;
}

/**
 * Build request body for OpenRouter/KIE providers
 */
export function buildOpenRouterRequest(options: BuildRequestOptions) {
  const { model, prompt, systemPrompt, provider } = options;

  // KIE uses model in URL path, not in body
  const body: any = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: 8192,
    temperature: 0.9,
    stream: false,
  };

  // Only include model for non-KIE providers
  if (provider !== 'kie') {
    body.model = model;
  }

  return body;
}

/**
 * Build request body for Modal provider
 */
export function buildModalRequest(options: BuildRequestOptions) {
  const { prompt, systemPrompt } = options;

  return {
    prompt,
    system_prompt: systemPrompt,
    max_tokens: 8192,
  };
}

/**
 * Build request body for Gemini provider
 */
export function buildGeminiRequest(options: BuildRequestOptions) {
  const { prompt, systemPrompt } = options;

  return {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };
}

/**
 * Build request body based on provider
 */
export function buildRequestBody(options: BuildRequestOptions): any {
  const { provider } = options;

  switch (provider) {
    case 'openrouter':
    case 'kie':
      return buildOpenRouterRequest(options);

    case 'modal':
      return buildModalRequest(options);

    case 'gemini':
      return buildGeminiRequest(options);

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}