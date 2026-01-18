/**
 * KIE.ai Model Database Access Functions
 *
 * These functions fetch KIE.ai model configurations from the database
 * instead of using hardcoded constants, enabling dynamic model management.
 */

import { prisma } from './prisma';
import { unstable_cache } from 'next/cache';

// Revalidation time for cache (5 minutes)
export const KIE_MODELS_CACHE_REVALIDATE = 300;

/**
 * Fetch all active KIE video models from database
 */
export async function getVideoModels() {
  return unstable_cache(
    async () => {
      const models = await prisma.kieVideoModel.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      return models;
    },
    ['kie-video-models'],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch a specific KIE video model by ID
 */
export async function getVideoModelById(modelId: string) {
  return unstable_cache(
    async () => {
      return prisma.kieVideoModel.findUnique({
        where: { modelId },
      });
    },
    [`kie-video-model-${modelId}`],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch all active KIE image models from database
 */
export async function getImageModels() {
  // Temporarily disable cache to debug
  const models = await prisma.kieImageModel.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return models;
}

/**
 * Fetch a specific KIE image model by ID
 */
export async function getImageModelById(modelId: string) {
  return unstable_cache(
    async () => {
      return prisma.kieImageModel.findUnique({
        where: { modelId },
      });
    },
    [`kie-image-model-${modelId}`],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch all active KIE TTS models from database
 */
export async function getTtsModels() {
  return unstable_cache(
    async () => {
      const models = await prisma.kieTtsModel.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      return models;
    },
    ['kie-tts-models'],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch a specific KIE TTS model by ID
 */
export async function getTtsModelById(modelId: string) {
  return unstable_cache(
    async () => {
      return prisma.kieTtsModel.findUnique({
        where: { modelId },
      });
    },
    [`kie-tts-model-${modelId}`],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch all active KIE music models from database
 */
export async function getMusicModels() {
  return unstable_cache(
    async () => {
      const models = await prisma.kieMusicModel.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      return models;
    },
    ['kie-music-models'],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch a specific KIE music model by ID
 */
export async function getMusicModelById(modelId: string) {
  return unstable_cache(
    async () => {
      return prisma.kieMusicModel.findUnique({
        where: { modelId },
      });
    },
    [`kie-music-model-${modelId}`],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch all active KIE LLM models from database
 */
export async function getLlmModels() {
  return unstable_cache(
    async () => {
      const models = await prisma.kieLlmModel.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      return models;
    },
    ['kie-llm-models'],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Fetch a specific KIE LLM model by ID
 */
export async function getLlmModelById(modelId: string) {
  return unstable_cache(
    async () => {
      return prisma.kieLlmModel.findUnique({
        where: { modelId },
      });
    },
    [`kie-llm-model-${modelId}`],
    { revalidate: KIE_MODELS_CACHE_REVALIDATE }
  )();
}

/**
 * Generic function to fetch any KIE model by type and ID
 */
export async function getKieModelById(modelId: string, type: 'video' | 'image' | 'tts' | 'music' | 'llm') {
  switch (type) {
    case 'video':
      return getVideoModelById(modelId);
    case 'image':
      return getImageModelById(modelId);
    case 'tts':
      return getTtsModelById(modelId);
    case 'music':
      return getMusicModelById(modelId);
    case 'llm':
      return getLlmModelById(modelId);
    default:
      return null;
  }
}

/**
 * Revalidate KIE models cache (call after updating models in database)
 */
export async function revalidateKieModelsCache() {
  // This would be used after admin updates to model configurations
  // For now, we rely on Next.js's built-in cache revalidation
}
