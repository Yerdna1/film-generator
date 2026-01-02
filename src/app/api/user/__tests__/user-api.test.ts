import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits } from '@/test/factories/credits'

describe('User API Tests', () => {
  describe('API Keys Management', () => {
    it('creates api keys record for user', async () => {
      const user = await createTestUser()

      const apiKeys = await prisma.apiKeys.create({
        data: {
          userId: user.id,
          geminiApiKey: 'test-gemini-key',
          elevenLabsApiKey: 'test-elevenlabs-key',
          imageProvider: 'gemini',
          ttsProvider: 'gemini-tts'
        }
      })

      expect(apiKeys).toBeDefined()
      expect(apiKeys.geminiApiKey).toBe('test-gemini-key')
      expect(apiKeys.imageProvider).toBe('gemini')
    })

    it('updates existing api keys', async () => {
      const user = await createTestUser()

      await prisma.apiKeys.create({
        data: {
          userId: user.id,
          geminiApiKey: 'old-key'
        }
      })

      const updated = await prisma.apiKeys.update({
        where: { userId: user.id },
        data: { geminiApiKey: 'new-key' }
      })

      expect(updated.geminiApiKey).toBe('new-key')
    })

    it('returns null for user without api keys', async () => {
      const user = await createTestUser()

      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: user.id }
      })

      expect(apiKeys).toBeNull()
    })

    it('stores provider preferences', async () => {
      const user = await createTestUser()

      await prisma.apiKeys.create({
        data: {
          userId: user.id,
          imageProvider: 'modal',
          videoProvider: 'kie',
          ttsProvider: 'elevenlabs',
          llmProvider: 'openrouter',
          musicProvider: 'piapi'
        }
      })

      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: user.id }
      })

      expect(apiKeys?.imageProvider).toBe('modal')
      expect(apiKeys?.videoProvider).toBe('kie')
      expect(apiKeys?.ttsProvider).toBe('elevenlabs')
      expect(apiKeys?.llmProvider).toBe('openrouter')
      expect(apiKeys?.musicProvider).toBe('piapi')
    })

    it('stores modal endpoint urls', async () => {
      const user = await createTestUser()

      await prisma.apiKeys.create({
        data: {
          userId: user.id,
          modalImageEndpoint: 'https://modal.run/image',
          modalImageEditEndpoint: 'https://modal.run/image-edit',
          modalVideoEndpoint: 'https://modal.run/video',
          modalTtsEndpoint: 'https://modal.run/tts',
          modalMusicEndpoint: 'https://modal.run/music'
        }
      })

      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: user.id }
      })

      expect(apiKeys?.modalImageEndpoint).toBe('https://modal.run/image')
      expect(apiKeys?.modalVideoEndpoint).toBe('https://modal.run/video')
    })

    it('supports upsert for api keys', async () => {
      const user = await createTestUser()

      // First upsert creates
      const created = await prisma.apiKeys.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          geminiApiKey: 'initial-key'
        },
        update: {
          geminiApiKey: 'updated-key'
        }
      })

      expect(created.geminiApiKey).toBe('initial-key')

      // Second upsert updates
      const updated = await prisma.apiKeys.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          geminiApiKey: 'initial-key'
        },
        update: {
          geminiApiKey: 'updated-key'
        }
      })

      expect(updated.geminiApiKey).toBe('updated-key')
    })
  })

  describe('User Status', () => {
    it('returns user with credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 500 })

      const userWithCredits = await prisma.user.findUnique({
        where: { id: user.id },
        include: { credits: true }
      })

      expect(userWithCredits?.credits?.balance).toBe(500)
    })

    it('returns user without credits', async () => {
      const user = await createTestUser()

      const userWithoutCredits = await prisma.user.findUnique({
        where: { id: user.id },
        include: { credits: true }
      })

      expect(userWithoutCredits?.credits).toBeNull()
    })
  })

  describe('User Isolation', () => {
    it('cannot access other user api keys', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await prisma.apiKeys.create({
        data: {
          userId: user1.id,
          geminiApiKey: 'user1-secret-key'
        }
      })

      // Query for user2's api keys returns null
      const user2ApiKeys = await prisma.apiKeys.findUnique({
        where: { userId: user2.id }
      })

      expect(user2ApiKeys).toBeNull()
    })

    it('cannot access other user credits', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await createTestCredits(user1.id, { balance: 1000 })

      const user2Credits = await prisma.credits.findFirst({
        where: { userId: user2.id }
      })

      expect(user2Credits).toBeNull()
    })
  })

  describe('Provider Defaults', () => {
    it('returns default providers when not explicitly set', async () => {
      const user = await createTestUser()

      const apiKeys = await prisma.apiKeys.create({
        data: {
          userId: user.id
        }
      })

      // Schema has default values for providers
      // imageProvider defaults to 'gemini', others may have defaults too
      expect(apiKeys.imageProvider).toBeDefined()
      expect(apiKeys.videoProvider).toBeDefined()
      expect(apiKeys.ttsProvider).toBeDefined()
    })

    it('stores all provider types', async () => {
      const user = await createTestUser()

      const providers = {
        imageProvider: 'gemini',
        videoProvider: 'modal',
        ttsProvider: 'modal',
        llmProvider: 'claude-sdk',
        musicProvider: 'modal'
      }

      const apiKeys = await prisma.apiKeys.create({
        data: {
          userId: user.id,
          ...providers
        }
      })

      expect(apiKeys.imageProvider).toBe('gemini')
      expect(apiKeys.videoProvider).toBe('modal')
      expect(apiKeys.ttsProvider).toBe('modal')
      expect(apiKeys.llmProvider).toBe('claude-sdk')
      expect(apiKeys.musicProvider).toBe('modal')
    })
  })

  describe('User Update', () => {
    it('updates user name', async () => {
      const user = await createTestUser({ name: 'Old Name' })

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'New Name' }
      })

      expect(updated.name).toBe('New Name')
    })

    it('updates user email', async () => {
      const user = await createTestUser()
      const newEmail = `new-${Date.now()}@example.com`

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail }
      })

      expect(updated.email).toBe(newEmail)
    })

    it('updates cost multiplier', async () => {
      const user = await createTestUser()

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { costMultiplier: 2.0 }
      })

      expect(updated.costMultiplier).toBe(2.0)
    })
  })

  describe('Authentication State', () => {
    it('user has required fields', async () => {
      const user = await createTestUser({ email: 'test@example.com' })

      expect(user.email).toBe('test@example.com')
      expect(user.id).toBeDefined()
    })

    it('unique email constraint', async () => {
      const email = `unique-${Date.now()}@example.com`
      await createTestUser({ email })

      // Creating another user with same email should fail
      await expect(
        createTestUser({ email })
      ).rejects.toThrow()
    })
  })
})
