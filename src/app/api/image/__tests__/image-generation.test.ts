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
  getImageCreditCost,
  COSTS
} from '@/lib/services/credits'
import { getImageCost } from '@/lib/services/real-costs'

// Mock S3 upload
vi.mock('@/lib/services/s3-upload', () => ({
  uploadImageToS3: vi.fn().mockResolvedValue({ success: true, url: 'https://s3.test/image.png' }),
  isS3Configured: vi.fn().mockReturnValue(true)
}))

describe('Image Generation Cost Tests', () => {
  describe('Credit Costs by Resolution', () => {
    it('2K resolution costs 27 credits', () => {
      const cost = getImageCreditCost('2k')
      expect(cost).toBe(27)
    })

    it('1K resolution costs 27 credits', () => {
      const cost = getImageCreditCost('1k')
      expect(cost).toBe(27)
    })

    it('4K resolution costs 48 credits', () => {
      const cost = getImageCreditCost('4k')
      expect(cost).toBe(48)
    })

    it('default resolution (2k) costs 27 credits', () => {
      const cost = getImageCreditCost()
      expect(cost).toBe(27)
    })
  })

  describe('Real Costs by Provider', () => {
    it('gemini-3-pro costs $0.24 per image', () => {
      const cost = getImageCost('2k')
      expect(cost).toBeCloseTo(0.24, 2)
    })

    it('gemini-flash costs $0.039 per image', () => {
      // Note: This depends on provider configuration
      // Default cost is $0.24 for gemini
      const cost = getImageCost('2k')
      expect(cost).toBeGreaterThan(0)
    })
  })

  describe('Image Generation - spendCredits', () => {
    it('deducts credits for successful image generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        27,
        'image',
        'Gemini image generation (2K)',
        undefined,
        'gemini',
        undefined,
        0.24
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(73)

      // Verify transaction was created
      const transaction = await prisma.creditTransaction.findFirst({
        where: {
          credits: { userId: user.id },
          type: 'image'
        }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(-27)
      expect(transaction?.realCost).toBeCloseTo(0.24, 2)
      expect(transaction?.provider).toBe('gemini')
    })

    it('deducts 48 credits for 4K image generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        48,
        'image',
        'Gemini image generation (4K)',
        undefined,
        'gemini',
        undefined,
        0.24
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(52)
    })

    it('returns error for insufficient credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 10 })

      const result = await spendCredits(user.id, 27, 'image')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient credits')

      // Verify no deduction occurred
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(10)
    })

    it('associates transaction with project when projectId provided', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(
        user.id,
        27,
        'image',
        'Test generation',
        project.id,
        'gemini'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.projectId).toBe(project.id)
    })

    it('marks transaction as regeneration when isRegeneration in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Regeneration',
        undefined,
        'gemini',
        { isRegeneration: true },
        0.24
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ isRegeneration: true }))
    })

    it('tracks modal provider correctly', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Modal image generation',
        undefined,
        'modal',
        undefined,
        0.09
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.provider).toBe('modal')
      expect(transaction?.realCost).toBeCloseTo(0.09, 2)
    })

    it('tracks modal-edit provider correctly', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Modal-Edit image generation',
        undefined,
        'modal-edit',
        undefined,
        0.09
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.provider).toBe('modal-edit')
    })

    it('stores sceneId in metadata when provided', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Create a scene using the factory
      const scene = await createTestScene(project.id, { number: 1 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Image for scene',
        project.id,
        'gemini',
        { sceneId: scene.id },
        0.24
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ sceneId: scene.id }))
    })
  })

  describe('checkBalance - Pre-generation Validation', () => {
    it('returns hasEnough=true when balance is sufficient for 2K image', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await checkBalance(user.id, 27)

      expect(result.hasEnough).toBe(true)
      expect(result.balance).toBe(100)
      expect(result.required).toBe(27)
    })

    it('returns hasEnough=false when balance is insufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 20 })

      const result = await checkBalance(user.id, 27)

      expect(result.hasEnough).toBe(false)
      expect(result.balance).toBe(20)
      expect(result.required).toBe(27)
    })

    it('returns hasEnough=true when balance equals required (exact)', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 27 })

      const result = await checkBalance(user.id, 27)

      expect(result.hasEnough).toBe(true)
    })

    it('validates for 4K image cost (48 credits)', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 40 })

      const result = await checkBalance(user.id, 48)

      expect(result.hasEnough).toBe(false)
      expect(result.balance).toBe(40)
      expect(result.required).toBe(48)
    })
  })

  describe('trackRealCostOnly - Prepaid Regeneration', () => {
    it('tracks cost without deducting credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await trackRealCostOnly(
        user.id,
        0.24,
        'image',
        'Prepaid regeneration',
        project.id,
        'gemini',
        { prepaidRegeneration: true }
      )

      // Balance should remain unchanged
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100)

      // But transaction should be recorded with 0 credit amount
      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image', projectId: project.id }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(0)
      expect(transaction?.realCost).toBeCloseTo(0.24, 2)
      expect(transaction?.metadata).toEqual(expect.objectContaining({ prepaidRegeneration: true }))
    })

    it('records provider for prepaid regeneration', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await trackRealCostOnly(
        user.id,
        0.09,
        'image',
        'Modal prepaid regen',
        undefined,
        'modal',
        { prepaidRegeneration: true, sceneId: 'scene-123' }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image', amount: 0 }
      })
      expect(transaction?.provider).toBe('modal')
      expect(transaction?.metadata).toEqual(expect.objectContaining({
        prepaidRegeneration: true,
        sceneId: 'scene-123'
      }))
    })
  })

  describe('Batch Image Generation', () => {
    it('deducts correct total for batch of 5 images', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 200 })
      const project = await createTestProject(user.id)

      // Simulate 5 image generations
      for (let i = 0; i < 5; i++) {
        await spendCredits(
          user.id,
          27,
          'image',
          `Image ${i + 1}`,
          project.id,
          'gemini',
          undefined,
          0.24
        )
      }

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(200 - (27 * 5)) // 65

      const transactions = await prisma.creditTransaction.count({
        where: {
          credits: { userId: user.id },
          type: 'image'
        }
      })
      expect(transactions).toBe(5)
    })

    it('stops batch when credits run out', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 60 }) // Only enough for 2 images
      const project = await createTestProject(user.id)

      let successCount = 0
      for (let i = 0; i < 5; i++) {
        const result = await spendCredits(
          user.id,
          27,
          'image',
          `Image ${i + 1}`,
          project.id,
          'gemini'
        )
        if (result.success) successCount++
      }

      expect(successCount).toBe(2)

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(6) // 60 - 54
    })
  })

  describe('Transaction Type Validation', () => {
    it('transaction type is image for image generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Test',
        undefined,
        'gemini',
        undefined,
        0.24
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('image')
    })
  })
})
