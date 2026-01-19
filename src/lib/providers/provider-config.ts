import { prisma } from '@/lib/db/prisma';
import { ProviderConfig, ProviderType, GenerationType, ProviderError } from './types';
import { ImageProvider, VideoProvider, TTSProvider, MusicProvider, LLMProvider } from '@/types/project';

// Environment variable mapping
const ENV_KEY_MAP: Partial<Record<ProviderType, string>> = {
  'gemini': 'GEMINI_API_KEY',
  'modal': 'MODAL_API_KEY',
  'modal-edit': 'MODAL_API_KEY',
  'kie': 'KIE_API_KEY',
  'elevenlabs': 'ELEVENLABS_API_KEY',
  'openai-tts': 'OPENAI_API_KEY',
  'piapi': 'PIAPI_API_KEY',
  'suno': 'SUNO_API_KEY',
};

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
  requestProvider?: ProviderType;
  projectId?: string;
  type: GenerationType;
}

/**
 * Resolves provider configuration with the following priority:
 * 1. Request-specific provider override
 * 2. Project model configuration (if projectId provided)
 * 3. Organization API keys (for premium/admin users)
 * 4. User settings from database (if settingsUserId provided)
 * 5. Owner settings from database (if ownerId provided)
 * 6. Default from environment variables
 */
export async function getProviderConfig(
  options: ProviderConfigOptions
): Promise<ProviderConfig> {
  const { userId, settingsUserId, ownerId, requestProvider, projectId, type } = options;

  let provider: ProviderType | undefined = requestProvider;
  let apiKey: string | undefined;
  let userHasOwnApiKey = false;
  let endpoint: string | undefined;
  let model: string | undefined;
  let userSettings: any = null;
  let projectModelConfig: any = null;

  // Priority 1: Request provider is already set

  // Priority 2: Check project model configuration if projectId is provided
  if (projectId && !provider) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        modelConfig: true,
      },
    });

    if (project?.modelConfig) {
      projectModelConfig = project.modelConfig as any;
      // Check if project has a specific provider configured for this type
      if (projectModelConfig[type]?.provider) {
        provider = projectModelConfig[type].provider as ProviderType;
        model = projectModelConfig[type]?.model;

        // If project is configured to use KIE, it means user has provided their API key
        if (provider === 'kie') {
          userHasOwnApiKey = true;
        }
      }
    }
  }

  // Priority 3: Check for organization API keys (for premium/admin users)
  let orgSettings: any = null;
  const userIdToCheck = settingsUserId || ownerId || userId;

  if (userIdToCheck) {
    // First check if user is premium or admin
    const user = await prisma.user.findUnique({
      where: { id: userIdToCheck },
      include: {
        subscription: true,
      },
    });

    const isAdmin = user?.role === 'admin';
    const isPremium = user?.subscription?.plan && user.subscription.plan !== 'free';

    if (isAdmin || isPremium) {
      // Check for organization API keys
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
          kieImageModel: true,
          kieVideoModel: true,
          kieTtsModel: true,
          kieMusicModel: true,
        },
      });
    }
  }

  // Priority 4 & 5: User's own settings
  if (userIdToCheck) {
    userSettings = await prisma.apiKeys.findUnique({
      where: { userId: userIdToCheck },
      select: {
        imageProvider: true,
        videoProvider: true,
        ttsProvider: true,
        musicProvider: true,
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

    if (userSettings && !provider) {
      // Get provider from user settings if not overridden
      const dbMapping = DB_PROVIDER_MAP[type];
      if (dbMapping) {
        provider = userSettings[dbMapping.providerField as keyof typeof userSettings] as ProviderType;
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
  }

  // Priority 5: Environment defaults
  if (!provider) {
    // Set default provider based on type
    switch (type) {
      case 'image':
        provider = 'gemini' as ImageProvider;
        break;
      case 'video':
        provider = 'kie' as VideoProvider;
        break;
      case 'tts':
        provider = 'gemini-tts' as TTSProvider;
        break;
      case 'music':
        provider = 'piapi' as MusicProvider;
        break;
      case 'llm':
        provider = 'openrouter' as LLMProvider;
        break;
    }
  }

  if (!apiKey) {
    const envKey = ENV_KEY_MAP[provider];
    if (envKey) {
      apiKey = process.env[envKey];
    }
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
    endpoint = await getModalEndpoint(type, projectId, orgEndpoints || userEndpoints);
  }

  // Get model configuration for KIE providers
  if (provider === 'kie') {
    model = await getKieModel(type, model);
  }

  if (!apiKey && !endpoint) {
    throw new ProviderError(
      `No API key configured for provider ${provider}`,
      'NO_API_KEY',
      provider
    );
  }

  return {
    provider,
    apiKey: apiKey || '',
    endpoint,
    model,
    userHasOwnApiKey,
  };
}

/**
 * Get Modal endpoint from user settings, project config, or environment
 */
async function getModalEndpoint(
  type: GenerationType,
  projectId?: string,
  userEndpoints?: Record<string, string | null>
): Promise<string | undefined> {
  // First check user endpoints if provided
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

  // Check project model config
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        modelConfig: true,
      },
    });

    if (project?.modelConfig) {
      const config = project.modelConfig as any;
      if (config[type]?.modalEndpoint) {
        return config[type].modalEndpoint;
      }
    }
  }

  // Fall back to environment variables
  switch (type) {
    case 'image':
      return process.env.MODAL_IMAGE_ENDPOINT;
    case 'video':
      return process.env.MODAL_VIDEO_ENDPOINT;
    case 'tts':
      return process.env.MODAL_TTS_ENDPOINT;
    case 'music':
      return process.env.MODAL_MUSIC_ENDPOINT;
  }
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