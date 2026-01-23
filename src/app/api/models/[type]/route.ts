import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import type {
  KieImageModel,
  KieVideoModel,
  KieTtsModel,
  KieMusicModel,
  KieLlmModel,
  ImageModel,
  VideoModel,
  TtsModel,
  MusicModel,
  LlmModel,
  Provider
} from '@prisma/client';

// Valid model types
const VALID_MODEL_TYPES = ['image', 'video', 'tts', 'music', 'llm'] as const;
type ModelType = typeof VALID_MODEL_TYPES[number];

// Union type for all model types
type AnyModel =
  | (KieImageModel & { providerId: string; displayName: string; apiModelId: string })
  | (KieVideoModel & { providerId: string; displayName: string; apiModelId: string })
  | (KieTtsModel & { providerId: string; displayName: string; apiModelId: string })
  | (KieMusicModel & { providerId: string; displayName: string; apiModelId: string })
  | (KieLlmModel & { providerId: string; displayName: string; apiModelId: string })
  | (ImageModel & { provider: Provider })
  | (VideoModel & { provider: Provider })
  | (TtsModel & { provider: Provider })
  | (MusicModel & { provider: Provider })
  | (LlmModel & { provider: Provider });

// Cache models for 5 minutes
const getCachedModels = unstable_cache(
  async (type: ModelType, providerId?: string) => {
    const where = { isActive: true };

    const models: any[] = [];

    // For KIE provider, use existing KIE-specific tables
    if (!providerId || providerId === 'kie') {
      switch (type) {
        case 'image':
          const kieImageModels = await prisma.kieImageModel.findMany({
            where: { isActive: true },
          });
          models.push(...kieImageModels.map(m => ({
            ...m,
            providerId: 'kie',
            displayName: m.name,
            apiModelId: m.apiModelId || m.modelId,
          })));
          break;
        case 'video':
          const kieVideoModels = await prisma.kieVideoModel.findMany({
            where: { isActive: true },
          });
          models.push(...kieVideoModels.map(m => ({
            ...m,
            providerId: 'kie',
            displayName: m.name,
            apiModelId: m.apiModelId || m.modelId,
          })));
          break;
        case 'tts':
          const kieTtsModels = await prisma.kieTtsModel.findMany({
            where: { isActive: true },
          });
          models.push(...kieTtsModels.map(m => ({
            ...m,
            providerId: 'kie',
            displayName: m.name,
            apiModelId: m.apiModelId || m.modelId,
          })));
          break;
        case 'music':
          const kieMusicModels = await prisma.kieMusicModel.findMany({
            where: { isActive: true },
          });
          models.push(...kieMusicModels.map(m => ({
            ...m,
            providerId: 'kie',
            displayName: m.name,
            apiModelId: m.apiModelId || m.modelId,
          })));
          break;
        case 'llm':
          const kieLlmModels = await prisma.kieLlmModel.findMany({
            where: { isActive: true },
          });
          models.push(...kieLlmModels.map(m => ({
            ...m,
            providerId: 'kie',
            displayName: m.name,
            apiModelId: m.apiModelId || m.modelId,
          })));
          break;
      }
    }

    // For non-KIE providers, use new generalized tables
    if (!providerId || providerId !== 'kie') {
      const nonKieWhere = providerId && providerId !== 'kie'
        ? { isActive: true, providerId }
        : { isActive: true, providerId: { not: 'kie' } };

      switch (type) {
        case 'image':
          const imageModels = await prisma.imageModel.findMany({
            where: nonKieWhere,
            include: { provider: true },
          });
          models.push(...imageModels);
          break;
        case 'video':
          const videoModels = await prisma.videoModel.findMany({
            where: nonKieWhere,
            include: { provider: true },
          });
          models.push(...videoModels);
          break;
        case 'tts':
          const ttsModels = await prisma.ttsModel.findMany({
            where: nonKieWhere,
            include: { provider: true },
          });
          models.push(...ttsModels);
          break;
        case 'music':
          const musicModels = await prisma.musicModel.findMany({
            where: nonKieWhere,
            include: { provider: true },
          });
          models.push(...musicModels);
          break;
        case 'llm':
          const llmModels = await prisma.llmModel.findMany({
            where: nonKieWhere,
            include: { provider: true },
          });
          models.push(...llmModels);
          break;
      }
    }

    return models;
  },
  ['models'],
  {
    revalidate: 1, // 1 second
    tags: ['models'],
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    // Get session to ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await params;
    const modelType = type as ModelType;

    // Validate model type
    if (!VALID_MODEL_TYPES.includes(modelType)) {
      return NextResponse.json(
        { error: `Invalid model type. Must be one of: ${VALID_MODEL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get providerId from query params
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId') || undefined;

    // Get models from database
    const models = await getCachedModels(modelType, providerId);

    // Transform models to consistent format
    const transformedModels = models.map((model: any) => {
      const baseModel = {
        id: model.id,
        modelId: model.modelId,
        name: model.name,
        displayName: model.displayName || model.name,
        providerId: model.providerId || model.provider?.providerId || '',
        providerName: model.provider?.displayName || undefined,
        description: model.description,
        apiModelId: model.apiModelId || model.modelId,
        cost: model.cost,
        credits: model.credits || undefined,
      };

      // Type-safe field access with proper type guards
      if (modelType === 'image') {
        return {
          ...baseModel,
          qualityOptions: (model as any).qualityOptions,
          supportedAspectRatios: (model as any).supportedAspectRatios,
          supportedResolutions: (model as any).supportedResolutions,
          maxPromptLength: (model as any).maxPromptLength,
          maxImages: (model as any).maxImages,
        };
      }

      if (modelType === 'video') {
        return {
          ...baseModel,
          supportedResolutions: (model as any).supportedResolutions,
          supportedDurations: (model as any).supportedDurations,
          supportedAspectRatios: (model as any).supportedAspectRatios,
          defaultResolution: (model as any).defaultResolution,
          defaultDuration: (model as any).defaultDuration,
          defaultAspectRatio: (model as any).defaultAspectRatio,
        };
      }

      if (modelType === 'tts') {
        return {
          ...baseModel,
          supportedLanguages: 'languageList' in model ? (model as any).languageList : (model as any).supportedLanguages,
          voiceOptions: (model as any).voiceOptions,
          maxTextLength: (model as any).maxTextLength,
        };
      }

      if (modelType === 'music') {
        return {
          ...baseModel,
          durationOptions: (model as any).durationOptions,
          genreSupport: (model as any).genreSupport,
          maxDuration: (model as any).maxDuration,
        };
      }

      if (modelType === 'llm') {
        return {
          ...baseModel,
          contextWindow: (model as any).contextWindow,
          maxOutputTokens: (model as any).maxOutputTokens,
          capabilities: (model as any).capabilities,
        };
      }

      return baseModel;
    });

    return NextResponse.json(
      { models: transformedModels },
      {
        headers: {
          'Cache-Control': 'public, max-age=1, stale-while-revalidate=2',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}