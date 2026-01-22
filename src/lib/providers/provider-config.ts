import { prisma } from '@/lib/db/prisma';
import { ProviderConfig, ProviderType, GenerationType, ProviderError } from './types';
import { ImageProvider, VideoProvider, TTSProvider, MusicProvider, LLMProvider } from '@/types/project';

// Provider to database field mapping
const DB_PROVIDER_MAP = {
  image: {
    providerField: 'imageProvider',
    apiKeyFields: {
      'gemini': 'geminiApiKey',
      'kie': 'kieApiKey',
      // Modal uses endpoints, not API keys
    },
  },
  video: {
    providerField: 'videoProvider',
    apiKeyFields: {
      'kie': 'kieApiKey',
      // Modal uses endpoints, not API keys
    },
  },
  tts: {
    providerField: 'ttsProvider',
    apiKeyFields: {
      'gemini-tts': 'geminiApiKey',
      'elevenlabs': 'elevenLabsApiKey',
      'openai-tts': 'openaiApiKey',
      'kie': 'kieApiKey',
      // Modal uses endpoints, not API keys
    },
  },
  music: {
    providerField: 'musicProvider',
    apiKeyFields: {
      'kie': 'kieApiKey',
      'piapi': 'piapiApiKey',
      'suno': 'sunoApiKey',
      // Modal uses endpoints, not API keys
    },
  },
  llm: {
    providerField: 'llmProvider',
    apiKeyFields: {
      'kie': 'kieApiKey',
      'openrouter': 'openRouterApiKey',
      'gemini': 'geminiApiKey',
      // Modal and claude-sdk use endpoints, not API keys
    },
  },
};

export interface ProviderConfigOptions {
  userId?: string;
  settingsUserId?: string;
  ownerId?: string;
  projectId?: string;
  type: GenerationType;
}

/**
 * Resolves provider configuration with the following priority:
 * 1. User settings from database (if userId provided)
 * 2. Organization API keys (for premium/admin users)
 */
export async function getProviderConfig(
  options: ProviderConfigOptions
): Promise<ProviderConfig> {
  const { userId, settingsUserId, ownerId, type } = options;

  console.log(`[Provider Config] Getting config for:`, {
    userId,
    settingsUserId,
    ownerId,
    type,
  });

  let provider: ProviderType | undefined;
  let apiKey: string | undefined;
  let userHasOwnApiKey = false;
  let endpoint: string | undefined;
  let model: string | undefined;
  let userSettings: any = null;

  const userIdToCheck = settingsUserId || ownerId || userId;
  let orgSettings: any = null;

  // Priority 1: Get user's settings including provider preferences
  if (userIdToCheck) {
    userSettings = await prisma.apiKeys.findUnique({
      where: { userId: userIdToCheck },
      select: {
        // Provider preferences
        llmProvider: true,
        imageProvider: true,
        videoProvider: true,
        ttsProvider: true,
        musicProvider: true,
        // KIE model preferences
        kieLlmModel: true,
        kieImageModel: true,
        kieVideoModel: true,
        kieTtsModel: true,
        kieMusicModel: true,
        // API keys
        geminiApiKey: true,
        kieApiKey: true,
        elevenLabsApiKey: true,
        openaiApiKey: true,
        piapiApiKey: true,
        sunoApiKey: true,
        openRouterApiKey: true,
        // Modal endpoints
        modalLlmEndpoint: true,
        modalTtsEndpoint: true,
        modalImageEndpoint: true,
        modalImageEditEndpoint: true,
        modalVideoEndpoint: true,
        modalMusicEndpoint: true,
      },
    });

    // Get provider from user settings
    if (userSettings) {
      const dbMapping = DB_PROVIDER_MAP[type];
      provider = userSettings[dbMapping.providerField] as ProviderType;

      // Get KIE model if using KIE provider
      if (provider === 'kie') {
        switch (type) {
          case 'llm':
            model = userSettings.kieLlmModel;
            break;
          case 'image':
            model = userSettings.kieImageModel;
            break;
          case 'video':
            model = userSettings.kieVideoModel;
            break;
          case 'tts':
            model = userSettings.kieTtsModel;
            break;
          case 'music':
            model = userSettings.kieMusicModel;
            break;
        }
        console.log(`[Provider Config] KIE model from user settings:`, {
          type,
          model,
          allKieModels: {
            llm: userSettings.kieLlmModel,
            image: userSettings.kieImageModel,
            video: userSettings.kieVideoModel,
            tts: userSettings.kieTtsModel,
            music: userSettings.kieMusicModel,
          }
        });
      }
    }

    // Priority 2: Check for organization API keys (for premium/admin users)
    const user = await prisma.user.findUnique({
      where: { id: userIdToCheck },
      include: {
        subscription: true,
      },
    });

    const isAdmin = user?.role === 'admin';
    const isPremium = user?.subscription?.plan && user.subscription.plan !== 'free';

    if (isAdmin || isPremium) {
      orgSettings = await prisma.organizationApiKeys.findFirst({
        select: {
          geminiApiKey: true,
          kieApiKey: true,
          elevenLabsApiKey: true,
          openaiApiKey: true,
          piapiApiKey: true,
          sunoApiKey: true,
          openRouterApiKey: true,
          modalLlmEndpoint: true,
          modalTtsEndpoint: true,
          modalImageEndpoint: true,
          modalImageEditEndpoint: true,
          modalVideoEndpoint: true,
          modalMusicEndpoint: true,
        },
      });
    }
  }

  if (provider) {
    // First try to get API key from organization settings for premium/admin users
    if (orgSettings) {
      const dbMapping = DB_PROVIDER_MAP[type];
      if (dbMapping?.apiKeyFields[provider as keyof typeof dbMapping.apiKeyFields]) {
        const apiKeyField = dbMapping.apiKeyFields[provider as keyof typeof dbMapping.apiKeyFields];
        apiKey = orgSettings[apiKeyField as keyof typeof orgSettings] as string;

        // Organization keys are not user's own keys
        if (apiKey) {
          userHasOwnApiKey = false;
        }
      }

      // Special case for KIE
      if (provider === 'kie' && !apiKey && orgSettings.kieApiKey) {
        apiKey = orgSettings.kieApiKey;
        userHasOwnApiKey = false;
      }
    }

    // If no org key found or user is not premium/admin, try user's own settings
    if (!apiKey && userSettings) {
      const dbMapping = DB_PROVIDER_MAP[type];
      if (dbMapping?.apiKeyFields[provider as keyof typeof dbMapping.apiKeyFields]) {
        const apiKeyField = dbMapping.apiKeyFields[provider as keyof typeof dbMapping.apiKeyFields];
        apiKey = userSettings[apiKeyField as keyof typeof userSettings] as string;
        if (apiKey) {
          userHasOwnApiKey = true;
        }
      }

      // Special case: If project is configured to use KIE but no API key found yet,
      // and user has a KIE API key in their settings, use it
      if (provider === 'kie' && !apiKey && userSettings.kieApiKey) {
        apiKey = userSettings.kieApiKey;
        userHasOwnApiKey = true;
      }
    }
  }

  // If no provider configured, return error (user must configure providers)
  if (!provider) {
    throw new ProviderError(
      `No ${type} provider configured. Please configure your providers in settings.`,
      'NO_PROVIDER_CONFIGURED',
      'none'
    );
  }

  // Get Modal endpoints if applicable
  if (provider === 'modal' || provider === 'modal-edit') {
    // First check organization endpoints for premium/admin users
    const orgEndpoints = orgSettings ? {
      modalImageEndpoint: orgSettings.modalImageEndpoint,
      modalImageEditEndpoint: orgSettings.modalImageEditEndpoint,
      modalVideoEndpoint: orgSettings.modalVideoEndpoint,
      modalTtsEndpoint: orgSettings.modalTtsEndpoint,
      modalMusicEndpoint: orgSettings.modalMusicEndpoint,
    } : undefined;

    // Then check user's own endpoints
    const userEndpoints = userSettings ? {
      modalImageEndpoint: userSettings.modalImageEndpoint,
      modalImageEditEndpoint: userSettings.modalImageEditEndpoint,
      modalVideoEndpoint: userSettings.modalVideoEndpoint,
      modalTtsEndpoint: userSettings.modalTtsEndpoint,
      modalMusicEndpoint: userSettings.modalMusicEndpoint,
    } : undefined;

    // Prefer organization endpoints, fallback to user endpoints
    endpoint = await getModalEndpoint(type, orgEndpoints || userEndpoints);
  }

  // Get model configuration for KIE providers
  if (provider === 'kie') {
    const kieModel = await getKieModel(type, model);
    console.log(`[Provider Config] KIE model resolution:`, {
      inputModel: model,
      resolvedModel: kieModel,
      type,
      userId: userIdToCheck,
    });
    model = kieModel;
  }

  if (!apiKey && !endpoint) {
    throw new ProviderError(
      `No API key configured for provider ${provider}`,
      'NO_API_KEY',
      provider
    );
  }

  const config = {
    provider,
    apiKey: apiKey || '',
    endpoint,
    model,
    userHasOwnApiKey,
  };

  console.log(`[Provider Config] Final configuration:`, {
    type,
    provider: config.provider,
    model: config.model,
    hasApiKey: !!config.apiKey,
    userHasOwnApiKey: config.userHasOwnApiKey,
    endpoint: config.endpoint,
  });

  return config;
}

/**
 * Get Modal endpoint from user or organization settings
 */
async function getModalEndpoint(
  type: GenerationType,
  userEndpoints?: Record<string, string | null>
): Promise<string | undefined> {
  // Check user/org endpoints if provided
  if (userEndpoints) {
    switch (type) {
      case 'image':
        if (userEndpoints.modalImageEndpoint) return userEndpoints.modalImageEndpoint;
        if (userEndpoints.modalImageEditEndpoint) return userEndpoints.modalImageEditEndpoint;
        break;
      case 'video':
        if (userEndpoints.modalVideoEndpoint) return userEndpoints.modalVideoEndpoint;
        break;
      case 'tts':
        if (userEndpoints.modalTtsEndpoint) return userEndpoints.modalTtsEndpoint;
        break;
      case 'music':
        if (userEndpoints.modalMusicEndpoint) return userEndpoints.modalMusicEndpoint;
        break;
    }
  }

  return undefined;
}

/**
 * Get KIE model configuration
 */
async function getKieModel(
  type: GenerationType,
  requestModel?: string
): Promise<string | undefined> {
  if (requestModel) {
    // Check if we need to map the model ID to API model ID
    if (type === 'image') {
      const modelConfig = await prisma.kieImageModel.findUnique({
        where: { modelId: requestModel },
        select: { apiModelId: true },
      });
      return modelConfig?.apiModelId || requestModel;
    } else if (type === 'video') {
      const modelConfig = await prisma.kieVideoModel.findUnique({
        where: { modelId: requestModel },
        select: { apiModelId: true },
      });
      return modelConfig?.apiModelId || requestModel;
    } else if (type === 'tts') {
      const modelConfig = await prisma.kieTtsModel.findUnique({
        where: { modelId: requestModel },
        select: { apiModelId: true },
      });
      return modelConfig?.apiModelId || requestModel;
    } else if (type === 'music') {
      const modelConfig = await prisma.kieMusicModel.findUnique({
        where: { modelId: requestModel },
        select: { apiModelId: true },
      });
      return modelConfig?.apiModelId || requestModel;
    } else if (type === 'llm') {
      const modelConfig = await prisma.kieLlmModel.findUnique({
        where: { modelId: requestModel },
        select: { apiModelId: true },
      });
      return modelConfig?.apiModelId || requestModel;
    }
  }

  return requestModel;
}

/**
 * Batch get provider configurations for multiple types
 */
export async function getProviderConfigs(
  options: Omit<ProviderConfigOptions, 'type'>,
  types: GenerationType[]
): Promise<Record<GenerationType, ProviderConfig>> {
  const configs = await Promise.all(
    types.map(type => getProviderConfig({ ...options, type }))
  );

  return types.reduce((acc, type, index) => {
    acc[type] = configs[index];
    return acc;
  }, {} as Record<GenerationType, ProviderConfig>);
}

/**
 * Update user provider preference
 */
export async function updateProviderPreference(
  userId: string,
  type: GenerationType,
  provider: ProviderType
): Promise<void> {
  const dbMapping = DB_PROVIDER_MAP[type];
  if (!dbMapping) {
    throw new Error(`Invalid generation type: ${type}`);
  }

  await prisma.apiKeys.upsert({
    where: { userId },
    create: {
      userId,
      [dbMapping.providerField]: provider,
    },
    update: {
      [dbMapping.providerField]: provider,
    },
  });
}

/**
 * Update user API key
 */
export async function updateApiKey(
  userId: string,
  provider: ProviderType,
  apiKey: string
): Promise<void> {
  const updates: any = {};

  // Find the appropriate field for this provider
  for (const mapping of Object.values(DB_PROVIDER_MAP)) {
    for (const [prov, field] of Object.entries(mapping.apiKeyFields)) {
      if (prov === provider) {
        updates[field] = apiKey;
        break;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error(`No API key field found for provider: ${provider}`);
  }

  await prisma.apiKeys.upsert({
    where: { userId },
    create: {
      userId,
      ...updates,
    },
    update: updates,
  });
}