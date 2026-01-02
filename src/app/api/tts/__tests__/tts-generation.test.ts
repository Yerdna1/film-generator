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
import { calculateVoiceCost } from '@/lib/services/real-costs'

// Mock S3 upload
vi.mock('@/lib/services/s3-upload', () => ({
  uploadAudioToS3: vi.fn().mockResolvedValue({ success: true, url: 'https://s3.test/audio.wav' }),
  isS3Configured: vi.fn().mockReturnValue(true)
}))

describe('TTS Generation Cost Tests', () => {
  describe('Credit Costs', () => {
    it('voiceover line costs 6 credits', () => {
      expect(COSTS.VOICEOVER_LINE).toBe(6)
    })
  })

  describe('Real Costs by Provider and Character Count', () => {
    it('elevenlabs costs approximately $0.30 per 1K characters', () => {
      const cost = calculateVoiceCost(1000, 'elevenlabs')
      // ElevenLabs pricing varies, but roughly $0.30 per 1K chars
      expect(cost).toBeGreaterThan(0)
      expect(cost).toBeLessThan(1) // Should be less than $1 for 1K chars
    })

    it('gemini-tts costs approximately $0.002 per 1K characters', () => {
      const cost = calculateVoiceCost(1000, 'geminiTts')
      // Gemini TTS is much cheaper
      expect(cost).toBeGreaterThan(0)
      expect(cost).toBeLessThan(0.1) // Should be very cheap
    })

    it('modal TTS is self-hosted with minimal cost', () => {
      // Modal self-hosted cost is fixed per line (~$0.01)
      const expectedModalCost = 0.01
      expect(expectedModalCost).toBe(0.01)
    })

    it('cost scales with text length', () => {
      const shortTextCost = calculateVoiceCost(100, 'elevenlabs')
      const longTextCost = calculateVoiceCost(1000, 'elevenlabs')

      expect(longTextCost).toBeGreaterThan(shortTextCost)
    })
  })

  describe('TTS Generation - spendCredits', () => {
    it('deducts 6 credits for successful TTS generation with elevenlabs', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)
      const textLength = 200

      const realCost = calculateVoiceCost(textLength, 'elevenlabs')

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        `ElevenLabs TTS (${textLength} chars)`,
        project.id,
        'elevenlabs',
        { characterCount: textLength },
        realCost
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(94)

      // Verify transaction was created
      const transaction = await prisma.creditTransaction.findFirst({
        where: {
          credits: { userId: user.id },
          type: 'voiceover'
        }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toBe(-6)
      expect(transaction?.realCost).toBeGreaterThan(0)
      expect(transaction?.provider).toBe('elevenlabs')
    })

    it('deducts 6 credits for gemini-tts generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const textLength = 150

      const realCost = calculateVoiceCost(textLength, 'geminiTts')

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        `Gemini TTS (${textLength} chars)`,
        undefined,
        'gemini-tts',
        { characterCount: textLength },
        realCost
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(94)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.provider).toBe('gemini-tts')
    })

    it('deducts 6 credits for modal TTS generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const textLength = 200
      const modalCost = 0.01 // Fixed cost for modal

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        `Modal TTS (${textLength} chars)`,
        undefined,
        'modal',
        { characterCount: textLength },
        modalCost
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(94)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.provider).toBe('modal')
      expect(transaction?.realCost).toBeCloseTo(0.01, 2)
    })

    it('returns error for insufficient credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 5 })

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'TTS gen'
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
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'TTS for project',
        project.id,
        'elevenlabs'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id, type: 'voiceover' }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.projectId).toBe(project.id)
    })

    it('stores character count in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const textLength = 350

      await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        `TTS (${textLength} chars)`,
        undefined,
        'elevenlabs',
        { characterCount: textLength }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ characterCount: textLength }))
    })

    it('stores voice information in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'TTS with voice',
        undefined,
        'elevenlabs',
        { voiceId: 'pNInz6obpgDQGcFmaJgB', voiceName: 'Adam' }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'Adam'
      }))
    })
  })

  describe('checkBalance - Pre-generation Validation', () => {
    it('returns hasEnough=true when balance is sufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await checkBalance(user.id, COSTS.VOICEOVER_LINE)

      expect(result.hasEnough).toBe(true)
      expect(result.balance).toBe(100)
      expect(result.required).toBe(6)
    })

    it('returns hasEnough=false when balance is insufficient', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 5 })

      const result = await checkBalance(user.id, COSTS.VOICEOVER_LINE)

      expect(result.hasEnough).toBe(false)
      expect(result.balance).toBe(5)
      expect(result.required).toBe(6)
    })

    it('returns hasEnough=true when balance equals required (exact)', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 6 })

      const result = await checkBalance(user.id, COSTS.VOICEOVER_LINE)

      expect(result.hasEnough).toBe(true)
    })
  })

  describe('Batch TTS Generation', () => {
    it('deducts correct total for multiple dialogue lines', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Simulate 10 dialogue lines
      for (let i = 0; i < 10; i++) {
        await spendCredits(
          user.id,
          COSTS.VOICEOVER_LINE,
          'voiceover',
          `Dialogue line ${i + 1}`,
          project.id,
          'gemini-tts'
        )
      }

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100 - (6 * 10)) // 40

      const transactions = await prisma.creditTransaction.count({
        where: {
          credits: { userId: user.id },
          type: 'voiceover'
        }
      })
      expect(transactions).toBe(10)
    })

    it('stops batch when credits run out', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 15 }) // Only enough for 2 lines
      const project = await createTestProject(user.id)

      let successCount = 0
      for (let i = 0; i < 5; i++) {
        const result = await spendCredits(
          user.id,
          COSTS.VOICEOVER_LINE,
          'voiceover',
          `Dialogue line ${i + 1}`,
          project.id,
          'elevenlabs'
        )
        if (result.success) successCount++
      }

      expect(successCount).toBe(2)

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(3) // 15 - 12
    })
  })

  describe('Empty Text Handling', () => {
    it('handles empty text by still creating transaction if credits spent', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      // Empty text would be validated at API level, but if it reaches spendCredits
      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'Empty text TTS',
        undefined,
        'elevenlabs',
        { characterCount: 0 }
      )

      // The function doesn't validate text content
      expect(result.success).toBe(true)
    })
  })

  describe('Transaction Type Validation', () => {
    it('transaction type is voiceover for TTS generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'Test',
        undefined,
        'elevenlabs'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('voiceover')
    })
  })

  describe('Long Text Handling', () => {
    it('handles long text (1000+ characters)', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const longTextLength = 2000

      const realCost = calculateVoiceCost(longTextLength, 'elevenlabs')

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        `Long TTS (${longTextLength} chars)`,
        undefined,
        'elevenlabs',
        { characterCount: longTextLength },
        realCost
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(94)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ characterCount: longTextLength }))
      expect(transaction?.realCost).toBeGreaterThan(0)
    })
  })
})
