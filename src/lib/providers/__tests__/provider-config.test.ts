/**
 * Unit tests for Provider Configuration System
 *
 * Tests the provider resolution priority order:
 * 1. Request-specific provider override
 * 2. Project model configuration
 * 3. Organization API keys (for premium/admin users)
 * 4. User settings from database
 * 5. Owner settings from database
 * 6. Default from environment variables
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/test/setup';
import {
  getProviderConfig,
  getProviderConfigs,
  updateProviderPreference,
  updateApiKey,
} from '../provider-config';
import { ProviderError } from '../types';
import { GenerationType } from '@/types/project';

// Helper to create test user
async function createTestUser(overrides: any = {}) {
  return prisma.user.create({
    data: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      ...overrides,
    },
  });
}

// Helper to create test API keys
async function createTestApiKeys(userId: string, keys: any = {}) {
  return prisma.apiKeys.create({
    data: {
      userId,
      geminiApiKey: keys.geminiApiKey || 'test-gemini-key',
      kieApiKey: keys.kieApiKey || 'test-kie-key',
      elevenLabsApiKey: keys.elevenLabsApiKey || 'test-elevenlabs-key',
      openaiApiKey: keys.openaiApiKey || 'test-openai-key',
      piapiApiKey: keys.piapiApiKey || 'test-piapi-key',
      sunoApiKey: keys.sunoApiKey || 'test-suno-key',
      openRouterApiKey: keys.openRouterApiKey || 'test-openrouter-key',
      modalLlmEndpoint: keys.modalLlmEndpoint || 'https://modal-llm.test',
      modalTtsEndpoint: keys.modalTtsEndpoint || 'https://modal-tts.test',
      modalImageEndpoint: keys.modalImageEndpoint || 'https://modal-image.test',
      modalImageEditEndpoint: keys.modalImageEditEndpoint || 'https://modal-image-edit.test',
      modalVideoEndpoint: keys.modalVideoEndpoint || 'https://modal-video.test',
      modalMusicEndpoint: keys.modalMusicEndpoint || 'https://modal-music.test',
      ...keys,
    },
  });
}

// Helper to create test project
async function createTestProject(userId: string, modelConfig: any = {}) {
  return prisma.project.create({
    data: {
      id: 'test-project-id',
      name: 'Test Project',
      userId,
      modelConfig,
    },
  });
}

describe('Provider Configuration', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.creditTransaction.deleteMany({});
    await prisma.credits.deleteMany({});
    await prisma.scene.deleteMany({});
    await prisma.character.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.apiKeys.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('Priority 1: Request-specific provider override', () => {
    it('should use requestProvider when specified', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
        kieApiKey: 'user-kie-key',
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'kie',
        type: 'image',
      });

      expect(config.provider).toBe('kie');
      expect(config.apiKey).toBe('user-kie-key');
      expect(config.userHasOwnApiKey).toBe(true);
    });

    it('should override project config with requestProvider', async () => {
      const user = await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
        kieApiKey: 'user-kie-key',
      });
      await createTestProject('test-user-id', {
        image: { provider: 'gemini', model: 'gemini-2.0-flash-exp' },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        projectId: 'test-project-id',
        requestProvider: 'kie',
        type: 'image',
      });

      expect(config.provider).toBe('kie');
    });
  });

  describe('Priority 2: Project model configuration', () => {
    it('should use provider from project modelConfig', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
      });
      await createTestProject('test-project-id', {
        image: { provider: 'gemini', model: 'gemini-2.0-flash-exp' },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        projectId: 'test-project-id',
        type: 'image',
      });

      expect(config.provider).toBe('gemini');
      expect(config.model).toBe('gemini-2.0-flash-exp');
    });

    it('should use project-specific KIE model', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        kieApiKey: 'user-kie-key',
      });

      // Create a KIE image model in DB
      await prisma.kieImageModel.create({
        data: {
          modelId: 'seedream/4-5-text-to-image',
          name: 'Seedream 4.5',
          apiModelId: 'seedream-4.5-api',
        },
      });

      await createTestProject('test-project-id', {
        image: { provider: 'kie', model: 'seedream/4-5-text-to-image' },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        projectId: 'test-project-id',
        type: 'image',
      });

      expect(config.provider).toBe('kie');
      expect(config.model).toBe('seedream-4.5-api');
    });

    it('should mark userHasOwnApiKey when project uses KIE', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        kieApiKey: 'user-kie-key',
      });

      await createTestProject('test-project-id', {
        image: { provider: 'kie', model: 'seedream/4-5-text-to-image' },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        projectId: 'test-project-id',
        type: 'image',
      });

      expect(config.userHasOwnApiKey).toBe(true);
    });
  });

  describe('Priority 3: Organization API keys (premium/admin users)', () => {
    it('should use org keys for admin users', async () => {
      await createTestUser({ role: 'admin' });
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
      });

      // Create org API keys
      await prisma.organizationApiKeys.create({
        data: {
          geminiApiKey: 'org-gemini-key',
          kieApiKey: 'org-kie-key',
        },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'gemini',
        type: 'image',
      });

      expect(config.apiKey).toBe('org-gemini-key');
      expect(config.userHasOwnApiKey).toBe(false);
    });

    it('should use org keys for premium users', async () => {
      const user = await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
      });

      // Create subscription
      await prisma.subscription.create({
        data: {
          userId: 'test-user-id',
          plan: 'premium',
          status: 'active',
        },
      });

      // Create org API keys
      await prisma.organizationApiKeys.create({
        data: {
          geminiApiKey: 'org-gemini-key',
        },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'gemini',
        type: 'image',
      });

      expect(config.apiKey).toBe('org-gemini-key');
      expect(config.userHasOwnApiKey).toBe(false);
    });

    it('should NOT use org keys for free users', async () => {
      await createTestUser({ role: 'user' });
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
      });

      // Create org API keys (should not be used)
      await prisma.organizationApiKeys.create({
        data: {
          geminiApiKey: 'org-gemini-key',
        },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'gemini',
        type: 'image',
      });

      expect(config.apiKey).toBe('user-gemini-key');
      expect(config.userHasOwnApiKey).toBe(true);
    });
  });

  describe('Priority 4 & 5: User and Owner settings', () => {
    it('should use user API keys when available', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'gemini',
        type: 'image',
      });

      expect(config.apiKey).toBe('user-gemini-key');
      expect(config.userHasOwnApiKey).toBe(true);
    });

    it('should use owner keys when settingsUserId provided', async () => {
      const owner = await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'owner-gemini-key',
      });

      const collaborator = await prisma.user.create({
        data: {
          id: 'collaborator-id',
          email: 'collaborator@example.com',
          name: 'Collaborator',
        },
      });

      const config = await getProviderConfig({
        userId: 'collaborator-id',
        settingsUserId: 'test-user-id',
        requestProvider: 'gemini',
        type: 'image',
      });

      expect(config.apiKey).toBe('owner-gemini-key');
    });

    it('should prioritize settingsUserId over userId', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'owner-gemini-key',
      });

      const collaborator = await prisma.user.create({
        data: {
          id: 'collaborator-id',
          email: 'collaborator@example.com',
          name: 'Collaborator',
        },
      });
      await createTestApiKeys('collaborator-id', {
        geminiApiKey: 'collaborator-gemini-key',
      });

      const config = await getProviderConfig({
        userId: 'collaborator-id',
        settingsUserId: 'test-user-id',
        requestProvider: 'gemini',
        type: 'image',
      });

      expect(config.apiKey).toBe('owner-gemini-key');
    });
  });

  describe('Priority 6: Default providers', () => {
    it('should use default provider for image type', async () => {
      await createTestUser();

      // Mock environment variable
      process.env.GEMINI_API_KEY = 'env-gemini-key';

      const config = await getProviderConfig({
        userId: 'test-user-id',
        type: 'image',
      });

      expect(config.provider).toBe('gemini');
      expect(config.apiKey).toBe('env-gemini-key');

      // Cleanup
      delete process.env.GEMINI_API_KEY;
    });

    it('should use default provider for video type', async () => {
      await createTestUser();

      process.env.KIE_API_KEY = 'env-kie-key';

      const config = await getProviderConfig({
        userId: 'test-user-id',
        type: 'video',
      });

      expect(config.provider).toBe('kie');
      expect(config.apiKey).toBe('env-kie-key');

      delete process.env.KIE_API_KEY;
    });

    it('should use default provider for tts type', async () => {
      await createTestUser();

      process.env.GEMINI_API_KEY = 'env-gemini-key';

      const config = await getProviderConfig({
        userId: 'test-user-id',
        type: 'tts',
      });

      expect(config.provider).toBe('gemini-tts');
      expect(config.apiKey).toBe('env-gemini-key');

      delete process.env.GEMINI_API_KEY;
    });

    it('should use default provider for music type', async () => {
      await createTestUser();

      process.env.PIAPI_API_KEY = 'env-piapi-key';

      const config = await getProviderConfig({
        userId: 'test-user-id',
        type: 'music',
      });

      expect(config.provider).toBe('piapi');
      expect(config.apiKey).toBe('env-piapi-key');

      delete process.env.PIAPI_API_KEY;
    });

    it('should use default provider for llm type', async () => {
      await createTestUser();

      process.env.OPENROUTER_API_KEY = 'env-openrouter-key';

      const config = await getProviderConfig({
        userId: 'test-user-id',
        type: 'llm',
      });

      expect(config.provider).toBe('openrouter');
      expect(config.apiKey).toBe('env-openrouter-key');

      delete process.env.OPENROUTER_API_KEY;
    });
  });

  describe('Modal endpoint resolution', () => {
    it('should use user Modal endpoints when provider is modal', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        modalImageEndpoint: 'https://user-modal-image.test',
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'modal',
        type: 'image',
      });

      expect(config.endpoint).toBe('https://user-modal-image.test');
    });

    it('should use project Modal endpoint over user endpoint', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        modalImageEndpoint: 'https://user-modal-image.test',
      });

      await createTestProject('test-project-id', {
        image: { provider: 'modal', modalEndpoint: 'https://project-modal-image.test' },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        projectId: 'test-project-id',
        type: 'image',
      });

      expect(config.endpoint).toBe('https://project-modal-image.test');
    });

    it('should fall back to environment variable for Modal endpoint', async () => {
      await createTestUser();

      process.env.MODAL_IMAGE_ENDPOINT = 'https://env-modal-image.test';

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'modal',
        type: 'image',
      });

      expect(config.endpoint).toBe('https://env-modal-image.test');

      delete process.env.MODAL_IMAGE_ENDPOINT;
    });
  });

  describe('Error handling', () => {
    it('should throw ProviderError when no API key is configured', async () => {
      await createTestUser();

      await expect(
        getProviderConfig({
          userId: 'test-user-id',
          requestProvider: 'gemini',
          type: 'image',
        })
      ).rejects.toThrow(ProviderError);
    });

    it('should include provider in error message', async () => {
      await createTestUser();

      try {
        await getProviderConfig({
          userId: 'test-user-id',
          requestProvider: 'gemini',
          type: 'image',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('gemini');
        expect(error.code).toBe('NO_API_KEY');
      }
    });

    it('should throw when Modal endpoint is missing and no API key', async () => {
      await createTestUser();

      await expect(
        getProviderConfig({
          userId: 'test-user-id',
          requestProvider: 'modal',
          type: 'image',
        })
      ).rejects.toThrow();
    });
  });

  describe('Batch provider configuration', () => {
    it('should fetch multiple provider configs efficiently', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        geminiApiKey: 'user-gemini-key',
        kieApiKey: 'user-kie-key',
        piapiApiKey: 'user-piapi-key',
        openRouterApiKey: 'user-openrouter-key',
      });

      const configs = await getProviderConfigs(
        { userId: 'test-user-id' },
        ['image', 'video', 'music', 'llm']
      );

      expect(configs).toHaveProperty('image');
      expect(configs).toHaveProperty('video');
      expect(configs).toHaveProperty('music');
      expect(configs).toHaveProperty('llm');

      expect(configs.image.provider).toBe('gemini');
      expect(configs.video.provider).toBe('kie');
      expect(configs.music.provider).toBe('piapi');
      expect(configs.llm.provider).toBe('openrouter');
    });
  });

  describe('Update functions', () => {
    it('should update provider preference', async () => {
      await createTestUser();

      await updateProviderPreference('test-user-id', 'image', 'kie');

      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: 'test-user-id' },
      });

      expect(apiKeys?.imageProvider).toBe('kie');
    });

    it('should update API key for provider', async () => {
      await createTestUser();

      await updateApiKey('test-user-id', 'gemini', 'new-gemini-key');

      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: 'test-user-id' },
      });

      expect(apiKeys?.geminiApiKey).toBe('new-gemini-key');
    });

    it('should create apiKeys record if it does not exist', async () => {
      await createTestUser();

      await updateApiKey('test-user-id', 'gemini', 'new-gemini-key');

      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: 'test-user-id' },
      });

      expect(apiKeys).toBeDefined();
      expect(apiKeys?.geminiApiKey).toBe('new-gemini-key');
    });
  });

  describe('Provider-specific behaviors', () => {
    it('should handle KIE model mapping', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        kieApiKey: 'user-kie-key',
      });

      // Create KIE model with API model ID mapping
      await prisma.kieImageModel.create({
        data: {
          modelId: 'seedream/4-5-text-to-image',
          name: 'Seedream 4.5',
          apiModelId: 'seedream-4.5-exp-api',
        },
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'kie',
        type: 'image',
      });

      // Should map model ID to API model ID
      expect(config.model).toBe('seedream-4.5-exp-api');
    });

    it('should return requestModel if no mapping found', async () => {
      await createTestUser();
      await createTestApiKeys('test-user-id', {
        kieApiKey: 'user-kie-key',
      });

      const config = await getProviderConfig({
        userId: 'test-user-id',
        requestProvider: 'kie',
        type: 'image',
      });

      // No model specified, should be undefined
      expect(config.model).toBeUndefined();
    });
  });
});
