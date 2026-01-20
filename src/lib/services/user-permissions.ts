import { prisma } from '@/lib/db/prisma';
import type { User, Subscription, ApiKeys, Credits } from '@prisma/client';

export interface UserPermissions {
  userType: 'free' | 'premium' | 'admin';
  canUseSystemKeys: boolean;
  requiresApiKeys: boolean;
  requiresCredits: boolean;
  hasRequiredApiKeys: boolean;
  hasCredits: boolean;
  canChoosePaymentMethod: boolean;
  preferOwnKeys: boolean;
}

export interface PaymentMethod {
  type: 'credits' | 'apiKeys';
  available: boolean;
}

export type UserWithRelations = User & {
  subscription?: Subscription | null;
  apiKeys?: ApiKeys | null;
  credits?: Credits | null;
};

export type OperationType = 'llm' | 'image' | 'video' | 'tts' | 'music';

const API_KEY_REQUIREMENTS: Record<OperationType, string[]> = {
  llm: ['openRouterApiKey', 'claudeApiKey', 'modalLlmEndpoint'],
  image: ['geminiApiKey', 'kieApiKey', 'nanoBananaApiKey', 'modalImageEndpoint'],
  video: ['kieApiKey', 'modalVideoEndpoint'],
  tts: ['elevenLabsApiKey', 'geminiApiKey', 'modalTtsEndpoint'],
  music: ['sunoApiKey', 'piapiApiKey']
};

/**
 * Get the user type based on role and subscription
 */
export function getUserType(user: UserWithRelations): 'free' | 'premium' | 'admin' {
  if (user.role === 'admin') return 'admin';
  if (user.subscription?.plan && user.subscription.plan !== 'free') return 'premium';
  return 'free';
}

/**
 * Check if user has required API keys for a specific operation
 */
export async function checkRequiredApiKeys(
  userId: string,
  operation: OperationType
): Promise<{ hasKeys: boolean; missing: string[]; provider?: string }> {
  const apiKeys = await prisma.apiKeys.findUnique({
    where: { userId }
  });

  if (!apiKeys) {
    return { hasKeys: false, missing: API_KEY_REQUIREMENTS[operation] };
  }

  // Get the provider for this operation type
  let provider: string | undefined;
  switch (operation) {
    case 'llm':
      provider = apiKeys.llmProvider;
      break;
    case 'image':
      provider = apiKeys.imageProvider;
      break;
    case 'video':
      provider = apiKeys.videoProvider;
      break;
    case 'tts':
      provider = apiKeys.ttsProvider;
      break;
    case 'music':
      provider = apiKeys.musicProvider;
      break;
  }

  // Check if the user has the required key for their selected provider
  const requiredKeys = API_KEY_REQUIREMENTS[operation];
  const missing: string[] = [];
  let hasRequiredKey = false;

  // Map provider to required key
  const providerKeyMap: Record<string, string> = {
    // LLM providers
    'openrouter': 'openRouterApiKey',
    'claude-sdk': 'claudeApiKey',
    'modal': 'modalLlmEndpoint',
    // Image providers
    'gemini': 'geminiApiKey',
    'kie': 'kieApiKey',
    'nanoBanana': 'nanoBananaApiKey',
    'modal-edit': 'modalImageEditEndpoint',
    // Video providers
    'modal-video': 'modalVideoEndpoint',
    // TTS providers
    'elevenlabs': 'elevenLabsApiKey',
    'gemini-tts': 'geminiApiKey',
    'modal-tts': 'modalTtsEndpoint',
    // Music providers
    'suno': 'sunoApiKey',
    'piapi': 'piapiApiKey'
  };

  if (provider && providerKeyMap[provider]) {
    const requiredKey = providerKeyMap[provider];
    hasRequiredKey = !!(apiKeys as any)[requiredKey];
    if (!hasRequiredKey) {
      missing.push(requiredKey);
    }
  } else {
    // Check if any of the possible keys exist
    for (const key of requiredKeys) {
      if (!(apiKeys as any)[key]) {
        missing.push(key);
      } else {
        hasRequiredKey = true;
        break;
      }
    }
  }

  return { hasKeys: hasRequiredKey, missing, provider };
}

/**
 * Get user permissions for the current user
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      apiKeys: true,
      credits: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const userType = getUserType(user);
  const hasCredits = (user.credits?.balance ?? 0) > 0;
  const hasApiKeys = !!user.apiKeys;

  // Get user preference for using own keys (stored in user metadata or apiKeys)
  const preferOwnKeys = user.apiKeys?.preferOwnKeys ?? false;

  const permissions: UserPermissions = {
    userType,
    canUseSystemKeys: userType === 'premium' || userType === 'admin',
    requiresApiKeys: userType === 'free',
    requiresCredits: userType === 'premium' || userType === 'admin',
    hasRequiredApiKeys: hasApiKeys,
    hasCredits,
    canChoosePaymentMethod: hasApiKeys && hasCredits,
    preferOwnKeys
  };

  return permissions;
}

/**
 * Get available payment methods for a user
 */
export async function getAvailablePaymentMethods(
  userId: string,
  operation?: OperationType
): Promise<PaymentMethod[]> {
  const permissions = await getUserPermissions(userId);
  const methods: PaymentMethod[] = [];

  // Check if user has API keys for the specific operation
  let hasOperationKeys = false;
  if (operation) {
    const keyCheck = await checkRequiredApiKeys(userId, operation);
    hasOperationKeys = keyCheck.hasKeys;
  } else {
    hasOperationKeys = permissions.hasRequiredApiKeys;
  }

  // Free users or users who prefer own keys
  if (permissions.userType === 'free' || permissions.preferOwnKeys) {
    if (hasOperationKeys) {
      methods.push({ type: 'apiKeys', available: true });
    }
    if (permissions.hasCredits) {
      methods.push({ type: 'credits', available: true });
    }
  } else {
    // Premium/admin users
    methods.push({ type: 'credits', available: permissions.hasCredits });
    if (hasOperationKeys) {
      methods.push({ type: 'apiKeys', available: true });
    }
  }

  return methods;
}

/**
 * Save user's payment preference
 */
export async function savePaymentPreference(
  userId: string,
  useOwnKeys: boolean
): Promise<void> {
  await prisma.apiKeys.upsert({
    where: { userId },
    update: { preferOwnKeys: useOwnKeys },
    create: {
      id: `apikeys_${userId}`,
      userId,
      preferOwnKeys: useOwnKeys
    }
  });
}

/**
 * Check if a user should use their own API keys
 */
export async function shouldUseOwnApiKeys(
  userId: string,
  operation: OperationType
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);

  // Free users always use own keys if available
  if (permissions.userType === 'free') {
    const keyCheck = await checkRequiredApiKeys(userId, operation);
    return keyCheck.hasKeys;
  }

  // Premium/admin users check preference
  if (permissions.preferOwnKeys) {
    const keyCheck = await checkRequiredApiKeys(userId, operation);
    return keyCheck.hasKeys;
  }

  return false;
}

/**
 * Get the appropriate error response based on what's missing
 */
export function getMissingRequirementError(
  permissions: UserPermissions,
  operation?: OperationType,
  missingKeys?: string[]
): {
  error: string;
  code: 'API_KEY_REQUIRED' | 'INSUFFICIENT_CREDITS';
  showApiKeyModal?: boolean;
  showCreditsModal?: boolean;
  missingKeys?: string[];
  operation?: OperationType;
} {
  if (permissions.requiresApiKeys || (permissions.preferOwnKeys && missingKeys?.length)) {
    return {
      error: 'API key required for this operation',
      code: 'API_KEY_REQUIRED',
      showApiKeyModal: true,
      missingKeys,
      operation
    };
  }

  return {
    error: 'Insufficient credits',
    code: 'INSUFFICIENT_CREDITS',
    showCreditsModal: true
  };
}

/**
 * Helper to format API key names for display
 */
export function formatApiKeyName(key: string): string {
  const keyNameMap: Record<string, string> = {
    openRouterApiKey: 'OpenRouter API Key',
    claudeApiKey: 'Claude API Key',
    geminiApiKey: 'Gemini API Key',
    grokApiKey: 'Grok API Key',
    kieApiKey: 'KIE.ai API Key',
    elevenLabsApiKey: 'ElevenLabs API Key',
    openaiApiKey: 'OpenAI API Key',
    nanoBananaApiKey: 'Nano Banana API Key',
    sunoApiKey: 'Suno API Key',
    piapiApiKey: 'PiAPI Key',
    modalLlmEndpoint: 'Modal LLM Endpoint',
    modalTtsEndpoint: 'Modal TTS Endpoint',
    modalImageEndpoint: 'Modal Image Endpoint',
    modalImageEditEndpoint: 'Modal Image Edit Endpoint',
    modalVideoEndpoint: 'Modal Video Endpoint'
  };

  return keyNameMap[key] || key;
}