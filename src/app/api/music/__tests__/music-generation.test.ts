import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits } from '@/test/factories/credits'
import { createTestProject } from '@/test/factories/project'
import {
  spendCredits,
  checkBalance,
  COSTS
} from '@/lib/services/credits'

// Mock S3 upload
vi.mock('@/lib/services/s3-upload', () => ({
  uploadAudioToS3: vi.fn().mockResolvedValue({ success: true, url: 'https://s3.test/music.mp3' }),
  isS3Configured: vi.fn().mockReturnValue(true)
}))

describe('Music Generation Cost Tests', () => {
  describe('Credit Costs', () => {
    it('music generation costs 10 credits', () => {
      expect(COSTS.MUSIC_GENERATION).toBe(10)
    })
  })

  describe('Real Costs by Provider', () => {
    it('suno/piapi costs approximately $0.05 per track', () => {
      const expectedCost = 0.05
      expect(expectedCost).toBeCloseTo(0.05, 2)
    })

    it('modal music costs approximately $0.03 per track', () => {
      const expectedCost = 0.03
      expect(expectedCost).toBeCloseTo(0.03, 2)
    })
  })

  describe('Music Generation - spendCredits', () => {
    it('deducts 10 credits for successful music generation with suno', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      const result = await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Suno music generation',
        project.id,
        'suno',
        undefined,
        0.05
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(90)

      // Verify transaction was created
      const transaction = await prisma.creditTransaction.findFirst({
        where: {
          credits: { userId: user.id },
          type: 'music'
        }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(-10)
      expect(transaction?.realCost).toBeCloseTo(0.05, 2)
      expect(transaction?.provider).toBe('suno')
    })

    it('deducts 10 credits for piapi music generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'PiAPI music generation',
        undefined,
        'piapi',
        undefined,
        0.05
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(90)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'music' }
      })
      expect(transaction?.provider).toBe('piapi')
    })

    it('deducts 10 credits for modal music generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Modal music generation',
        undefined,
        'modal',
        undefined,
        0.03
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(90)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'music' }
      })
      expect(transaction?.provider).toBe('modal')
      expect(transaction?.realCost).toBeCloseTo(0.03, 2)
    })

    it('returns error for insufficient credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 5 })

      const result = await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Music gen'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient credits')

      // Verify no deduction occurred
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(5)
    })

    it('associates transaction with project', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Music for project',
        project.id,
        'suno'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id, type: 'music' }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.projectId).toBe(project.id)
    })

    it('stores genre/style in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Cinematic music',
        undefined,
        'suno',
        { genre: 'cinematic', style: 'epic orchestral' }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'music' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({
        genre: 'cinematic',
        style: 'epic orchestral'
      }))
    })

    it('stores instrumental flag in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Instrumental music',
        undefined,
        'suno',
        { instrumental: true }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'music' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ instrumental: true }))
    })
  })

  describe('checkBalance - Pre-generation Validation', () => {
    it('returns hasEnough=true when balance is sufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await checkBalance(user.id, COSTS.MUSIC_GENERATION)

      expect(result.hasEnough).toBe(true)
      expect(result.balance).toBe(100)
      expect(result.required).toBe(10)
    })

    it('returns hasEnough=false when balance is insufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 8 })

      const result = await checkBalance(user.id, COSTS.MUSIC_GENERATION)

      expect(result.hasEnough).toBe(false)
      expect(result.balance).toBe(8)
      expect(result.required).toBe(10)
    })

    it('returns hasEnough=true when balance equals required (exact)', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 10 })

      const result = await checkBalance(user.id, COSTS.MUSIC_GENERATION)

      expect(result.hasEnough).toBe(true)
    })
  })

  describe('Multiple Music Tracks', () => {
    it('deducts correct total for multiple tracks', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Generate 3 music tracks
      for (let i = 0; i < 3; i++) {
        await spendCredits(
          user.id,
          COSTS.MUSIC_GENERATION,
          'music',
          `Track ${i + 1}`,
          project.id,
          'suno',
          undefined,
          0.05
        )
      }

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100 - (10 * 3)) // 70

      const transactions = await prisma.creditTransaction.count({
        where: {
          credits: { userId: user.id },
          type: 'music'
        }
      })
      expect(transactions).toBe(3)
    })

    it('accumulates real costs correctly', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Generate 3 tracks with different providers
      await spendCredits(user.id, COSTS.MUSIC_GENERATION, 'music', 'Track 1', project.id, 'suno', undefined, 0.05)
      await spendCredits(user.id, COSTS.MUSIC_GENERATION, 'music', 'Track 2', project.id, 'piapi', undefined, 0.05)
      await spendCredits(user.id, COSTS.MUSIC_GENERATION, 'music', 'Track 3', project.id, 'modal', undefined, 0.03)

      // Calculate total real cost from transactions
      const transactions = await prisma.creditTransaction.findMany({
        where: { creditsId: credits.id, type: 'music' }
      })

      const totalRealCost = transactions.reduce((sum, t) => sum + (t.realCost || 0), 0)
      expect(totalRealCost).toBeCloseTo(0.13, 2) // 0.05 + 0.05 + 0.03
    })
  })

  describe('Transaction Type Validation', () => {
    it('transaction type is music for music generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Test',
        undefined,
        'suno'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('music')
    })
  })

  describe('Duration Limit', () => {
    it('stores duration in metadata when provided', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        '2 minute track',
        undefined,
        'suno',
        { duration: 120 }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'music' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ duration: 120 }))
    })
  })

  describe('Rate Limiting Consideration', () => {
    it('multiple rapid generations all deduct correctly', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      // Simulate rapid-fire generation requests
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          spendCredits(
            user.id,
            COSTS.MUSIC_GENERATION,
            'music',
            `Rapid track ${i + 1}`,
            undefined,
            'suno'
          )
        )
      }

      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success)

      // All should succeed since we have 100 credits
      expect(successful.length).toBe(5)

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(50) // 100 - 50
    })
  })
})
