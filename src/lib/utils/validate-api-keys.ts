import type { ApiKeys } from '@prisma/client';

// List of expected fields in ApiKeys object
const expectedFields = [
  'id',
  'userId',
  'openRouterApiKey',
  'geminiApiKey',
  'openaiApiKey',
  'elevenLabsApiKey',
  'kieApiKey',
  'piapiApiKey',
  'grokApiKey',
  'claudeApiKey',
  'nanoBananaApiKey',
  'sunoApiKey',
  'modalLlmEndpoint',
  'modalTtsEndpoint',
  'modalImageEndpoint',
  'modalImageEditEndpoint',
  'modalVideoEndpoint',
  'modalMusicEndpoint',
  'llmProvider',
  'imageProvider',
  'videoProvider',
  'ttsProvider',
  'musicProvider',
  'openRouterModel',
  'kieImageModel',
  'kieVideoModel',
  'kieTtsModel',
  'kieMusicModel',
  'kieLlmModel',
  'preferOwnKeys',
  'createdAt',
  'updatedAt',
];

// Type guard to check if data is valid ApiKeys object
export function isValidApiKeysData(data: any): data is ApiKeys {
  if (!data || typeof data !== 'object') {
    console.warn('[validateApiKeys] Invalid data: not an object', data);
    return false;
  }

  // Check if it has required fields (at minimum id and userId)
  if (!data.id || !data.userId) {
    console.warn('[validateApiKeys] Missing required fields: id or userId', data);
    return false;
  }

  // Check if all fields are either expected or null/undefined
  for (const key of Object.keys(data)) {
    if (!expectedFields.includes(key)) {
      console.warn(`[validateApiKeys] Unexpected field: ${key}`, data);
      // Don't reject, just warn - the API might have new fields
    }
  }

  // Type check string fields
  const stringFields = [
    'id',
    'userId',
    'openRouterApiKey',
    'geminiApiKey',
    'openaiApiKey',
    'elevenLabsApiKey',
    'kieApiKey',
    'piapiApiKey',
    'grokApiKey',
    'claudeApiKey',
    'nanoBananaApiKey',
    'sunoApiKey',
    'modalLlmEndpoint',
    'modalTtsEndpoint',
    'modalImageEndpoint',
    'modalImageEditEndpoint',
    'modalVideoEndpoint',
    'modalMusicEndpoint',
    'llmProvider',
    'imageProvider',
    'videoProvider',
    'ttsProvider',
    'musicProvider',
    'openRouterModel',
    'kieImageModel',
    'kieVideoModel',
    'kieTtsModel',
    'kieMusicModel',
    'kieLlmModel',
  ];

  for (const field of stringFields) {
    const value = data[field];
    if (value !== null && value !== undefined && typeof value !== 'string') {
      console.warn(`[validateApiKeys] Field ${field} is not a string:`, value);
      return false;
    }
  }

  // Type check boolean field
  if (data.preferOwnKeys !== undefined && typeof data.preferOwnKeys !== 'boolean') {
    console.warn('[validateApiKeys] preferOwnKeys is not a boolean:', data.preferOwnKeys);
    return false;
  }

  // Type check date fields
  const dateFields = ['createdAt', 'updatedAt'];
  for (const field of dateFields) {
    const value = data[field];
    if (value !== null && value !== undefined) {
      // Accept string dates or Date objects
      const isValidDate = typeof value === 'string' || value instanceof Date;
      if (!isValidDate) {
        console.warn(`[validateApiKeys] Field ${field} is not a valid date:`, value);
        return false;
      }
    }
  }

  return true;
}