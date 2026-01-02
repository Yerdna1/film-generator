import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits, createCreditsWithHistory } from '@/test/factories/credits'
import { createTestProject } from '@/test/factories/project'

// Import actual functions from the credits service
import {
  getOrCreateCredits,
  spendCredits,
  trackRealCostOnly,
  addCredits,
  checkBalance,
  getUserCostMultiplier,
  getUserStatistics,
  COSTS  // Note: it's COSTS not CREDIT_COSTS
} from '../credits'

describe('Credits Service', () => {
  describe('getOrCreateCredits', () => {
    it('creates credit record with 0 balance for new user', async () => {
      const user = await createTestUser()

      const credits = await getOrCreateCredits(user.id)

      expect(credits).toBeDefined()
      expect(credits.balance).toBe(0) // Default starting credits from config
      expect(credits.totalSpent).toBe(0)
      expect(credits.totalEarned).toBeGreaterThanOrEqual(0)
    })

    it('returns existing credit record for user with credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 500 })

      const credits = await getOrCreateCredits(user.id)

      expect(credits.balance).toBe(500)
    })

    it('handles concurrent calls gracefully', async () => {
      const user = await createTestUser()

      // Simulate concurrent calls - use allSettled to handle potential race conditions
      const results = await Promise.allSettled([
        getOrCreateCredits(user.id),
        getOrCreateCredits(user.id),
        getOrCreateCredits(user.id)
      ])

      // At least one should succeed
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      expect(successfulResults.length).toBeGreaterThan(0)

      // All successful results should have the same balance
      if (successfulResults.length > 1) {
        const balances = successfulResults.map(r => (r as PromiseFulfilledResult<any>).value.balance)
        expect(new Set(balances).size).toBe(1)
      }
    })
  })

  describe('spendCredits', () => {
    it('deducts credits and tracks real cost for sufficient balance', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      // spendCredits(userId, amount, type, description?, projectId?, provider?, metadata?, realCostOverride?)
      const result = await spendCredits(
        user.id,
        27,
        'image',
        'Test image generation',
        undefined,
        'gemini',
        undefined,
        0.24  // realCostOverride
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(73)
    })

    it('returns error for insufficient balance with no deduction', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 10 })

      const result = await spendCredits(user.id, 27, 'image')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient credits')

      // Verify no deduction occurred
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(10)
    })

    it('handles zero amount operations', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(user.id, 0, 'other')

      expect(result.success).toBe(true)
      expect(result.balance).toBe(100)
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
        project.id
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
        undefined,
        { isRegeneration: true }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ isRegeneration: true }))
    })

    it('creates transaction record with correct data', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Test image',
        undefined,
        'gemini',
        undefined,
        0.24
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { creditsId: credits.id }
      })

      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(-27) // Negative for spending
      expect(transaction?.realCost).toBeCloseTo(0.24, 2)
      expect(transaction?.type).toBe('image')
      expect(transaction?.provider).toBe('gemini')
    })
  })

  describe('trackRealCostOnly', () => {
    it('tracks cost without affecting credit balance', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await trackRealCostOnly(
        user.id,
        0.24,
        'image',
        'Prepaid regeneration',
        project.id,
        'gemini'
      )

      // Balance should remain unchanged
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100)

      // But transaction should be recorded
      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(0) // No credit deduction
      expect(transaction?.realCost).toBeCloseTo(0.24, 2)
    })

    it('stores correct metadata including prepaid flag', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await trackRealCostOnly(
        user.id,
        0.24,
        'image',
        'Prepaid regen',
        undefined,
        undefined,
        { isPrepaid: true, regenerationRequestId: 'req-123' }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image', amount: 0 }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({
        isPrepaid: true,
        regenerationRequestId: 'req-123'
      }))
    })
  })

  describe('addCredits', () => {
    it('adds credits with purchase type', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await addCredits(user.id, 500, 'purchase')

      expect(result.success).toBe(true)
      expect(result.balance).toBe(600)
    })

    it('adds credits with bonus type', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await addCredits(user.id, 50, 'bonus')

      expect(result.success).toBe(true)
      expect(result.balance).toBe(150)
    })

    it('updates totalEarned field correctly', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100, totalEarned: 100 })

      await addCredits(user.id, 200, 'purchase')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.totalEarned).toBe(300)
    })
  })

  describe('checkBalance', () => {
    it('returns true when user has sufficient credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await checkBalance(user.id, 50)

      expect(result.hasEnough).toBe(true)
      expect(result.balance).toBe(100)
      expect(result.required).toBe(50)
    })

    it('returns false when user has insufficient credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 20 })

      const result = await checkBalance(user.id, 50)

      expect(result.hasEnough).toBe(false)
      expect(result.balance).toBe(20)
    })

    it('handles exact balance edge case', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 50 })

      const result = await checkBalance(user.id, 50)

      expect(result.hasEnough).toBe(true)
      expect(result.balance).toBe(50)
    })
  })

  describe('getUserCostMultiplier', () => {
    it('returns default multiplier for users', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const multiplier = await getUserCostMultiplier(user.id)

      // Default multiplier from user.costMultiplier (typically 1.5)
      expect(multiplier).toBeGreaterThanOrEqual(1.0)
    })
  })

  describe('getUserStatistics', () => {
    it('returns correct totals for user with transaction history', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)
      await createCreditsWithHistory(user.id, 500, [
        { amount: 27, realCost: 0.24, type: 'image', provider: 'gemini-3-pro', projectId: project.id },
        { amount: 27, realCost: 0.09, type: 'image', provider: 'modal-qwen', projectId: project.id },
        { amount: 20, realCost: 0.10, type: 'video', provider: 'kie', projectId: project.id },
        { amount: 6, realCost: 0.05, type: 'voiceover', provider: 'elevenlabs', projectId: project.id }
      ])

      const result = await getUserStatistics(user.id)

      // Check credits summary
      expect(result.credits.totalSpent).toBe(80)
      expect(result.credits.totalRealCost).toBeCloseTo(0.48, 2)
    })

    it('returns empty statistics for new user', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await getUserStatistics(user.id)

      expect(result.stats.totalTransactions).toBe(0)
      expect(result.stats.totalGenerations).toBe(0)
    })

    it('correctly counts regenerations separately', async () => {
      const user = await createTestUser()
      await createCreditsWithHistory(user.id, 500, [
        { amount: 27, realCost: 0.24, type: 'image', isRegeneration: false },
        { amount: 27, realCost: 0.24, type: 'image', isRegeneration: true },
        { amount: 27, realCost: 0.24, type: 'image', isRegeneration: true }
      ])

      const result = await getUserStatistics(user.id)

      // 1 regular generation + 2 regenerations = 3 total transactions
      // But totalGenerations only counts non-regeneration transactions
      expect(result.stats.totalGenerations).toBe(1)
      expect(result.stats.totalRegenerations).toBe(2)
    })
  })

  describe('COSTS constants', () => {
    it('has correct credit costs defined', () => {
      expect(COSTS.IMAGE_GENERATION_2K).toBe(27)
      expect(COSTS.IMAGE_GENERATION_4K).toBe(48)
      expect(COSTS.VIDEO_GENERATION).toBe(20)
      expect(COSTS.VOICEOVER_LINE).toBe(6)
      expect(COSTS.SCENE_GENERATION).toBe(2)
      expect(COSTS.CHARACTER_GENERATION).toBe(2)
      expect(COSTS.MUSIC_GENERATION).toBe(10)
    })
  })
})
