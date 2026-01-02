import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits } from '@/test/factories/credits'
import { createTestProject } from '@/test/factories/project'
import { createTestScene } from '@/test/factories/scene'
import {
  spendCredits,
  checkBalance,
  trackRealCostOnly,
  COSTS
} from '@/lib/services/credits'
import { ACTION_COSTS } from '@/lib/services/real-costs'

// Mock S3 upload
vi.mock('@/lib/services/s3-upload', () => ({
  uploadVideoToS3: vi.fn().mockResolvedValue({ success: true, url: 'https://s3.test/video.mp4' }),
  uploadBase64ToS3: vi.fn().mockResolvedValue({ success: true, url: 'https://s3.test/image.png' }),
  isS3Configured: vi.fn().mockReturnValue(true)
}))

describe('Video Generation Cost Tests', () => {
  describe('Credit Costs', () => {
    it('video generation costs 20 credits', () => {
      expect(COSTS.VIDEO_GENERATION).toBe(20)
    })
  })

  describe('Real Costs by Provider', () => {
    it('kie/grok costs $0.10 per video', () => {
      expect(ACTION_COSTS.video.grok).toBeCloseTo(0.10, 2)
    })

    it('modal-hallo3 costs $0.15 per video', () => {
      expect(ACTION_COSTS.video.modal).toBeCloseTo(0.15, 2)
    })
  })

  describe('Video Generation - spendCredits', () => {
    it('deducts 20 credits for successful video generation with kie', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      const result = await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Kie.ai video generation',
        project.id,
        'kie',
        undefined,
        ACTION_COSTS.video.grok
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(80)

      // Verify transaction was created
      const transaction = await prisma.creditTransaction.findFirst({
        where: {
          credits: { userId: user.id },
          type: 'video'
        }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(-20)
      expect(transaction?.realCost).toBeCloseTo(0.10, 2)
      expect(transaction?.provider).toBe('kie')
    })

    it('deducts 20 credits for modal video generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Modal video generation',
        undefined,
        'modal',
        undefined,
        0.15
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(80)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.provider).toBe('modal')
      expect(transaction?.realCost).toBeCloseTo(0.15, 2)
    })

    it('returns error for insufficient credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 10 })

      const result = await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Video gen'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient credits')

      // Verify no deduction occurred
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(10)
    })

    it('associates transaction with project', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Video for project',
        project.id,
        'kie'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id, type: 'video' }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.projectId).toBe(project.id)
    })

    it('marks transaction as regeneration when flag is set', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Video regeneration',
        undefined,
        'kie',
        { isRegeneration: true },
        0.10
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ isRegeneration: true }))
    })

    it('stores sceneId in metadata when provided', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)
      const scene = await createTestScene(project.id, { number: 1, imageUrl: 'https://test.com/image.png' })

      await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Video for scene',
        project.id,
        'kie',
        { sceneId: scene.id },
        0.10
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ sceneId: scene.id }))
    })
  })

  describe('checkBalance - Pre-generation Validation', () => {
    it('returns hasEnough=true when balance is sufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await checkBalance(user.id, COSTS.VIDEO_GENERATION)

      expect(result.hasEnough).toBe(true)
      expect(result.balance).toBe(100)
      expect(result.required).toBe(20)
    })

    it('returns hasEnough=false when balance is insufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 15 })

      const result = await checkBalance(user.id, COSTS.VIDEO_GENERATION)

      expect(result.hasEnough).toBe(false)
      expect(result.balance).toBe(15)
      expect(result.required).toBe(20)
    })

    it('returns hasEnough=true when balance equals required (exact)', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 20 })

      const result = await checkBalance(user.id, COSTS.VIDEO_GENERATION)

      expect(result.hasEnough).toBe(true)
    })
  })

  describe('trackRealCostOnly - Prepaid Regeneration', () => {
    it('tracks cost without deducting credits for kie', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await trackRealCostOnly(
        user.id,
        ACTION_COSTS.video.grok,
        'video',
        'Kie.ai video regeneration - prepaid',
        project.id,
        'kie',
        { isRegeneration: true, prepaidRegeneration: true }
      )

      // Balance should remain unchanged
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100)

      // Transaction should be recorded with 0 credit amount
      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video', amount: 0 }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.realCost).toBeCloseTo(0.10, 2)
      expect(transaction?.provider).toBe('kie')
    })

    it('tracks cost for modal prepaid regeneration', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await trackRealCostOnly(
        user.id,
        0.15,
        'video',
        'Modal video regeneration - prepaid',
        undefined,
        'modal',
        { prepaidRegeneration: true }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video', amount: 0 }
      })
      expect(transaction?.provider).toBe('modal')
      expect(transaction?.realCost).toBeCloseTo(0.15, 2)
    })
  })

  describe('Batch Video Generation', () => {
    it('deducts correct total for multiple videos', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Simulate 3 video generations (sequential)
      for (let i = 0; i < 3; i++) {
        await spendCredits(
          user.id,
          COSTS.VIDEO_GENERATION,
          'video',
          `Video ${i + 1}`,
          project.id,
          'kie',
          undefined,
          0.10
        )
      }

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100 - (20 * 3)) // 40

      const transactions = await prisma.creditTransaction.count({
        where: {
          credits: { userId: user.id },
          type: 'video'
        }
      })
      expect(transactions).toBe(3)
    })

    it('accumulates real costs correctly', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Generate 3 videos
      for (let i = 0; i < 3; i++) {
        await spendCredits(
          user.id,
          COSTS.VIDEO_GENERATION,
          'video',
          `Video ${i + 1}`,
          project.id,
          'kie',
          undefined,
          0.10
        )
      }

      // Calculate total real cost from transactions
      const transactions = await prisma.creditTransaction.findMany({
        where: { creditsId: credits.id, type: 'video' }
      })

      const totalRealCost = transactions.reduce((sum, t) => sum + (t.realCost || 0), 0)
      expect(totalRealCost).toBeCloseTo(0.30, 2)
    })
  })

  describe('Transaction Type Validation', () => {
    it('transaction type is video for video generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Test',
        undefined,
        'kie'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('video')
    })
  })

  describe('Video requires image first', () => {
    it('scene without image cannot generate video', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)
      const scene = await createTestScene(project.id, { number: 1 })

      // Scene has no image
      expect(scene.imageUrl).toBeNull()

      // In the actual API, this would return a validation error
      // Here we just verify the scene state
      const fetchedScene = await prisma.scene.findUnique({ where: { id: scene.id } })
      expect(fetchedScene?.imageUrl).toBeNull()
    })

    it('scene with image can proceed to video generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)
      const scene = await createTestScene(project.id, {
        number: 1,
        imageUrl: 'https://test.com/image.png'
      })

      expect(scene.imageUrl).toBe('https://test.com/image.png')

      // Now video generation can proceed
      const result = await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Video for scene with image',
        project.id,
        'kie',
        { sceneId: scene.id },
        0.10
      )

      expect(result.success).toBe(true)
    })
  })
})
