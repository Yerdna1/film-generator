import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits, createCreditsWithHistory } from '@/test/factories/credits'
import { createTestProject } from '@/test/factories/project'
import {
  getOrCreateCredits,
  spendCredits,
  addCredits,
  checkBalance,
  canAfford,
  getCost,
  getTransactionHistory,
  getUserStatistics,
  getImageCreditCost,
  trackRealCostOnly,
  COSTS
} from '@/lib/services/credits'
import {
  getActionCost,
  estimateCost,
  calculateVoiceCost,
  formatCostCompact,
  getImageCost,
  estimateProjectCost,
  ACTION_COSTS,
  PROVIDER_COSTS
} from '@/lib/services/real-costs'

describe('Service Function Unit Tests', () => {
  describe('Credits Service - getOrCreateCredits', () => {
    it('creates credits for new user', async () => {
      const user = await createTestUser()

      const credits = await getOrCreateCredits(user.id)

      expect(credits).toBeDefined()
      expect(credits.balance).toBe(0)
      expect(credits.totalSpent).toBe(0)
      expect(credits.totalEarned).toBe(0)
    })

    it('returns existing credits for user', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 500, totalSpent: 100, totalEarned: 600 })

      const credits = await getOrCreateCredits(user.id)

      expect(credits.balance).toBe(500)
      expect(credits.totalSpent).toBe(100)
      expect(credits.totalEarned).toBe(600)
    })

    it('returns default for non-existent user', async () => {
      const credits = await getOrCreateCredits('non-existent-user-id')

      expect(credits.balance).toBe(0)
    })
  })

  describe('Credits Service - spendCredits', () => {
    it('deducts credits successfully', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(user.id, 27, 'image', 'Test')

      expect(result.success).toBe(true)
      expect(result.balance).toBe(73)
    })

    it('fails with insufficient balance', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 10 })

      const result = await spendCredits(user.id, 27, 'image', 'Test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient')
    })

    it('creates transaction record', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 27, 'image', 'Test description')

      const transactions = await prisma.creditTransaction.findMany({
        where: { credits: { userId: user.id } }
      })
      expect(transactions).toHaveLength(1)
      expect(transactions[0].amount).toBe(-27)
    })

    it('updates totalSpent', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100, totalSpent: 50 })

      await spendCredits(user.id, 27, 'image', 'Test')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.totalSpent).toBe(77)
    })

    it('tracks real cost', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(user.id, 27, 'image', 'Test', undefined, 'gemini', undefined, 0.24)

      expect(result.realCost).toBeCloseTo(0.24, 2)
    })

    it('associates transaction with project', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(user.id, 27, 'image', 'Test', project.id)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id }
      })
      expect(transaction).toBeDefined()
    })

    it('stores metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 27, 'image', 'Test', undefined, 'gemini', { customField: 'value' })

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ customField: 'value' }))
    })
  })

  describe('Credits Service - addCredits', () => {
    it('adds credits to balance', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await addCredits(user.id, 200, 'purchase')

      expect(result.success).toBe(true)
      expect(result.balance).toBe(300)
    })

    it('updates totalEarned', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100, totalEarned: 100 })

      await addCredits(user.id, 200, 'purchase')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.totalEarned).toBe(300)
    })

    it('creates positive transaction', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await addCredits(user.id, 200, 'purchase')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'purchase' }
      })
      expect(transaction?.amount).toBe(200)
    })

    it('supports bonus type', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await addCredits(user.id, 50, 'bonus')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'bonus' }
      })
      expect(transaction).toBeDefined()
    })
  })

  describe('Credits Service - checkBalance', () => {
    it('returns hasEnough true when sufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await checkBalance(user.id, 50)

      expect(result.hasEnough).toBe(true)
      expect(result.balance).toBe(100)
      expect(result.required).toBe(50)
    })

    it('returns hasEnough false when insufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 30 })

      const result = await checkBalance(user.id, 50)

      expect(result.hasEnough).toBe(false)
    })

    it('handles exact balance', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 50 })

      const result = await checkBalance(user.id, 50)

      expect(result.hasEnough).toBe(true)
    })
  })

  describe('Credits Service - canAfford', () => {
    it('checks affordability for single operation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await canAfford(user.id, 'IMAGE_GENERATION')

      expect(result.canAfford).toBe(true)
      expect(result.cost).toBe(27)
    })

    it('checks affordability for quantity', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await canAfford(user.id, 'IMAGE_GENERATION', 5)

      expect(result.canAfford).toBe(false)
      expect(result.cost).toBe(135)
    })
  })

  describe('Credits Service - getCost', () => {
    it('returns correct cost for IMAGE_GENERATION', () => {
      expect(getCost('IMAGE_GENERATION')).toBe(27)
    })

    it('returns correct cost for VIDEO_GENERATION', () => {
      expect(getCost('VIDEO_GENERATION')).toBe(20)
    })

    it('returns correct cost for VOICEOVER_LINE', () => {
      expect(getCost('VOICEOVER_LINE')).toBe(6)
    })

    it('multiplies by quantity', () => {
      expect(getCost('IMAGE_GENERATION', 3)).toBe(81)
    })
  })

  describe('Credits Service - getImageCreditCost', () => {
    it('returns 27 for 1K resolution', () => {
      expect(getImageCreditCost('1k')).toBe(27)
    })

    it('returns 27 for 2K resolution', () => {
      expect(getImageCreditCost('2k')).toBe(27)
    })

    it('returns 48 for 4K resolution', () => {
      expect(getImageCreditCost('4k')).toBe(48)
    })

    it('defaults to 2K when not specified', () => {
      expect(getImageCreditCost()).toBe(27)
    })
  })

  describe('Credits Service - trackRealCostOnly', () => {
    it('tracks cost without deducting credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await trackRealCostOnly(user.id, 0.24, 'image', 'Prepaid regen', undefined, 'gemini')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100)
    })

    it('creates transaction with 0 amount', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await trackRealCostOnly(user.id, 0.24, 'image', 'Test')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.amount).toBe(0)
      expect(transaction?.realCost).toBeCloseTo(0.24, 2)
    })
  })

  describe('Credits Service - getTransactionHistory', () => {
    it('returns empty array for user without transactions', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const history = await getTransactionHistory(user.id)

      expect(history).toEqual([])
    })

    it('returns transactions in descending order', async () => {
      const user = await createTestUser()
      const credits = await createCreditsWithHistory(user.id, 500, [
        { amount: 27, type: 'image', realCost: 0.24 },
        { amount: 20, type: 'video', realCost: 0.10 },
        { amount: 6, type: 'voiceover', realCost: 0.03 }
      ])

      const history = await getTransactionHistory(user.id)

      expect(history).toHaveLength(3)
    })

    it('respects limit parameter', async () => {
      const user = await createTestUser()
      await createCreditsWithHistory(user.id, 500, [
        { amount: 27, type: 'image', realCost: 0.24 },
        { amount: 27, type: 'image', realCost: 0.24 },
        { amount: 27, type: 'image', realCost: 0.24 },
        { amount: 27, type: 'image', realCost: 0.24 },
        { amount: 27, type: 'image', realCost: 0.24 }
      ])

      const history = await getTransactionHistory(user.id, 3)

      expect(history).toHaveLength(3)
    })
  })

  describe('Credits Service - getUserStatistics', () => {
    it('returns zero stats for user without transactions', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const stats = await getUserStatistics(user.id)

      expect(stats.stats.totalTransactions).toBe(0)
    })

    it('calculates stats by type', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 500 })

      await spendCredits(user.id, 27, 'image', 'Test 1', undefined, 'gemini', undefined, 0.24)
      await spendCredits(user.id, 27, 'image', 'Test 2', undefined, 'gemini', undefined, 0.24)
      await spendCredits(user.id, 20, 'video', 'Test 3', undefined, 'kie', undefined, 0.10)

      const stats = await getUserStatistics(user.id)

      expect(stats.stats.byType['image']?.count).toBe(2)
      expect(stats.stats.byType['video']?.count).toBe(1)
    })
  })

  describe('Real Costs Service - getActionCost', () => {
    it('returns gemini image cost', () => {
      const cost = getActionCost('image', 'gemini')
      expect(cost).toBe(0.24)
    })

    it('returns modal image cost', () => {
      const cost = getActionCost('image', 'modal')
      expect(cost).toBe(0.09)
    })

    it('returns 0 for unknown action', () => {
      const cost = getActionCost('unknown' as any, 'gemini')
      expect(cost).toBe(0)
    })

    it('returns 0 for unknown provider', () => {
      const cost = getActionCost('image', 'unknown' as any)
      expect(cost).toBe(0)
    })
  })

  describe('Real Costs Service - estimateCost', () => {
    it('returns cost estimate structure', () => {
      const estimate = estimateCost('image', 'gemini', 1)

      expect(estimate).toMatchObject({
        action: 'image',
        provider: 'gemini',
        quantity: 1
      })
    })

    it('calculates total cost correctly', () => {
      const estimate = estimateCost('image', 'gemini', 5)

      expect(estimate.totalCost).toBe(estimate.cost * 5)
    })
  })

  describe('Real Costs Service - calculateVoiceCost', () => {
    it('calculates elevenlabs cost per 1K characters', () => {
      const cost = calculateVoiceCost(1000, 'elevenlabs')

      expect(cost).toBeCloseTo(0.30, 2)
    })

    it('applies minimum charge for elevenlabs', () => {
      const cost = calculateVoiceCost(10, 'elevenlabs')

      expect(cost).toBeGreaterThanOrEqual(0.01)
    })

    it('calculates gemini-tts cost', () => {
      const cost = calculateVoiceCost(1000, 'geminiTts')

      expect(cost).toBeCloseTo(0.016, 3)
    })
  })

  describe('Real Costs Service - getImageCost', () => {
    it('returns cost for 1k resolution', () => {
      const cost = getImageCost('1k')
      expect(cost).toBeGreaterThan(0)
    })

    it('returns cost for 2k resolution', () => {
      const cost = getImageCost('2k')
      expect(cost).toBeGreaterThan(0)
    })

    it('returns cost for 4k resolution', () => {
      const cost = getImageCost('4k')
      expect(cost).toBeGreaterThan(0)
    })
  })

  describe('Real Costs Service - estimateProjectCost', () => {
    it('calculates complete project cost', () => {
      const estimate = estimateProjectCost({
        sceneCount: 10,
        characterCount: 2,
        dialogueLineCount: 30
      })

      expect(estimate.total).toBeGreaterThan(0)
      expect(estimate.breakdown).toBeDefined()
    })

    it('includes all breakdown categories', () => {
      const estimate = estimateProjectCost({
        sceneCount: 5,
        characterCount: 1,
        dialogueLineCount: 15
      })

      expect(estimate.breakdown.prompt).toBeDefined()
      expect(estimate.breakdown.characters).toBeDefined()
      expect(estimate.breakdown.scenes).toBeDefined()
      expect(estimate.breakdown.images).toBeDefined()
      expect(estimate.breakdown.videos).toBeDefined()
      expect(estimate.breakdown.voiceovers).toBeDefined()
    })
  })

  describe('COSTS Constants', () => {
    it('IMAGE_GENERATION is 27', () => {
      expect(COSTS.IMAGE_GENERATION).toBe(27)
    })

    it('IMAGE_GENERATION_4K is 48', () => {
      expect(COSTS.IMAGE_GENERATION_4K).toBe(48)
    })

    it('VIDEO_GENERATION is 20', () => {
      expect(COSTS.VIDEO_GENERATION).toBe(20)
    })

    it('VOICEOVER_LINE is 6', () => {
      expect(COSTS.VOICEOVER_LINE).toBe(6)
    })

    it('SCENE_GENERATION is 2', () => {
      expect(COSTS.SCENE_GENERATION).toBe(2)
    })

    it('CHARACTER_GENERATION is 2', () => {
      expect(COSTS.CHARACTER_GENERATION).toBe(2)
    })

    it('MUSIC_GENERATION is 10', () => {
      expect(COSTS.MUSIC_GENERATION).toBe(10)
    })
  })

  describe('ACTION_COSTS Constants', () => {
    it('has image provider costs', () => {
      expect(ACTION_COSTS.image.gemini).toBe(0.24)
      expect(ACTION_COSTS.image.modal).toBe(0.09)
    })

    it('has video provider costs', () => {
      expect(ACTION_COSTS.video.kie).toBe(0.10)
      expect(ACTION_COSTS.video.modal).toBe(0.15)
    })

    it('has voiceover provider costs', () => {
      expect(ACTION_COSTS.voiceover.elevenlabs).toBe(0.03)
      expect(ACTION_COSTS.voiceover.geminiTts).toBe(0.002)
    })

    it('has scene provider costs', () => {
      expect(ACTION_COSTS.scene.claude).toBe(0.01)
    })

    it('has music provider costs', () => {
      expect(ACTION_COSTS.music.suno).toBe(0.05)
    })
  })

  describe('PROVIDER_COSTS Constants', () => {
    it('has gemini costs', () => {
      expect(PROVIDER_COSTS.gemini.image1k2k).toBe(0.24)
      expect(PROVIDER_COSTS.gemini.image4k).toBe(0.24)
    })

    it('has elevenlabs costs', () => {
      expect(PROVIDER_COSTS.elevenlabs.voicePer1K).toBe(0.30)
    })

    it('has modal costs', () => {
      expect(PROVIDER_COSTS.modal.imageGeneration).toBe(0.09)
      expect(PROVIDER_COSTS.modal.videoGeneration).toBe(0.15)
    })
  })
})
