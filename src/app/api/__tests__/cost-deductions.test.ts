import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits, addCreditsTransaction } from '@/test/factories/credits'
import { createTestProject } from '@/test/factories/project'
import { createTestScene } from '@/test/factories/scene'
import {
  spendCredits,
  trackRealCostOnly,
  getImageCreditCost,
  COSTS
} from '@/lib/services/credits'
import {
  getImageCost,
  getActionCost,
  estimateCost,
  ACTION_COSTS,
  PROVIDER_COSTS
} from '@/lib/services/real-costs'

describe('Complete Cost Deduction Tests', () => {
  describe('Image Generation Costs', () => {
    it('gemini 1K costs 27 credits', () => {
      const cost = getImageCreditCost('1k')
      expect(cost).toBe(27)
    })

    it('gemini 2K costs 27 credits', () => {
      const cost = getImageCreditCost('2k')
      expect(cost).toBe(27)
    })

    it('gemini 4K costs 48 credits', () => {
      const cost = getImageCreditCost('4k')
      expect(cost).toBe(48)
    })

    it('modal image costs 27 credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        27,
        'image',
        'Modal image generation',
        undefined,
        'modal',
        undefined,
        0.09
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(73)
    })

    it('tracks $0.24 real cost for gemini', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Gemini image generation',
        undefined,
        'gemini',
        undefined,
        0.24
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image', credits: { userId: user.id } }
      })
      expect(transaction?.realCost).toBeCloseTo(0.24, 2)
    })

    it('tracks $0.09 real cost for modal', async () => {
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
        where: { type: 'image', credits: { userId: user.id } }
      })
      expect(transaction?.realCost).toBeCloseTo(0.09, 2)
    })

    it('marks regeneration with isRegeneration metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        27,
        'image',
        'Image regeneration',
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

    it('transaction type is image for image generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 27, 'image', 'Test', undefined, 'gemini', undefined, 0.24)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('image')
    })

    it('provider is recorded in transaction', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 27, 'image', 'Test', undefined, 'gemini', undefined, 0.24)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.provider).toBe('gemini')
    })

    it('projectId is associated with transaction', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(user.id, 27, 'image', 'Test', project.id, 'gemini', undefined, 0.24)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.projectId).toBe(project.id)
    })
  })

  describe('Video Generation Costs', () => {
    it('kie costs 20 credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Kie video generation',
        undefined,
        'kie',
        undefined,
        0.10
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(80)
    })

    it('modal video costs 20 credits', async () => {
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
    })

    it('tracks $0.10 real cost for kie', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Kie video',
        undefined,
        'kie',
        undefined,
        0.10
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.realCost).toBeCloseTo(0.10, 2)
    })

    it('tracks $0.15 real cost for modal video', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VIDEO_GENERATION,
        'video',
        'Modal video',
        undefined,
        'modal',
        undefined,
        0.15
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.realCost).toBeCloseTo(0.15, 2)
    })

    it('marks video regeneration with isRegeneration', async () => {
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

    it('transaction type is video for video generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 20, 'video', 'Test', undefined, 'kie')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('video')
    })

    it('video provider is recorded', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 20, 'video', 'Test', undefined, 'modal', undefined, 0.15)

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.provider).toBe('modal')
    })

    it('video tracks duration in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        20,
        'video',
        'Video with duration',
        undefined,
        'kie',
        { duration: 6 },
        0.10
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ duration: 6 }))
    })

    it('video projectId is associated', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(user.id, 20, 'video', 'Test', project.id, 'kie')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id, type: 'video' }
      })
      expect(transaction?.projectId).toBe(project.id)
    })

    it('video sceneId is associated in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)
      const scene = await createTestScene(project.id, { number: 1 })

      await spendCredits(
        user.id,
        20,
        'video',
        'Test',
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

  describe('TTS Generation Costs', () => {
    it('elevenlabs costs 6 credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'ElevenLabs TTS',
        undefined,
        'elevenlabs',
        undefined,
        0.03
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(94)
    })

    it('gemini-tts costs 6 credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'Gemini TTS',
        undefined,
        'gemini-tts',
        undefined,
        0.002
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(94)
    })

    it('modal tts costs 6 credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'Modal TTS',
        undefined,
        'modal',
        undefined,
        0.01
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(94)
    })

    it('tracks $0.03 real cost for elevenlabs', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'ElevenLabs',
        undefined,
        'elevenlabs',
        undefined,
        0.03
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.realCost).toBeCloseTo(0.03, 2)
    })

    it('tracks $0.002 real cost for gemini-tts', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'Gemini TTS',
        undefined,
        'gemini-tts',
        undefined,
        0.002
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.realCost).toBeCloseTo(0.002, 3)
    })

    it('tracks $0.01 real cost for modal tts', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'Modal TTS',
        undefined,
        'modal',
        undefined,
        0.01
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.realCost).toBeCloseTo(0.01, 2)
    })

    it('transaction type is voiceover for tts generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 6, 'voiceover', 'Test')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('voiceover')
    })

    it('voice is recorded in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        6,
        'voiceover',
        'TTS with voice',
        undefined,
        'elevenlabs',
        { voice: 'Rachel' },
        0.03
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ voice: 'Rachel' }))
    })

    it('character count tracked in metadata', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        6,
        'voiceover',
        'TTS with char count',
        undefined,
        'elevenlabs',
        { characterCount: 150 },
        0.03
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'voiceover' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ characterCount: 150 }))
    })

    it('tts projectId is associated', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(user.id, 6, 'voiceover', 'Test', project.id, 'elevenlabs')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { projectId: project.id, type: 'voiceover' }
      })
      expect(transaction?.projectId).toBe(project.id)
    })
  })

  describe('Scene Generation Costs', () => {
    it('scene generation costs 2 credits per scene', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.SCENE_GENERATION,
        'scene',
        'Scene generation',
        undefined,
        'claude-sdk',
        undefined,
        0.01
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(98)
    })

    it('scene generation tracks real cost by provider', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.SCENE_GENERATION,
        'scene',
        'Claude SDK scene',
        undefined,
        'claude-sdk',
        undefined,
        0.01
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'scene' }
      })
      expect(transaction?.realCost).toBeCloseTo(0.01, 2)
      expect(transaction?.provider).toBe('claude-sdk')
    })

    it('transaction type is scene for scene generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 2, 'scene', 'Test')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { credits: { userId: user.id } }
      })
      expect(transaction?.type).toBe('scene')
    })

    it('batch scene deduction is correct (N scenes = N*2 credits)', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      const batchSize = 5
      // Simulate batch scene generation
      for (let i = 0; i < batchSize; i++) {
        await spendCredits(
          user.id,
          COSTS.SCENE_GENERATION,
          'scene',
          `Scene ${i + 1}`,
          project.id,
          'claude-sdk',
          undefined,
          0.01
        )
      }

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100 - (batchSize * COSTS.SCENE_GENERATION)) // 90
    })

    it('character generation costs 2 credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.CHARACTER_GENERATION,
        'character',
        'Character generation',
        undefined,
        'claude-sdk',
        undefined,
        0.008
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(98)
    })

    it('transaction type is character for character generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 2, 'character', 'Test', undefined, 'claude-sdk')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'character' }
      })
      expect(transaction?.type).toBe('character')
    })
  })

  describe('Music Generation Costs', () => {
    it('suno costs 10 credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const result = await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Suno music generation',
        undefined,
        'suno',
        undefined,
        0.05
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(90)
    })

    it('tracks $0.05 real cost for music', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Suno music',
        undefined,
        'suno',
        undefined,
        0.05
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'music' }
      })
      expect(transaction?.realCost).toBeCloseTo(0.05, 2)
    })

    it('transaction type is music for music generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 10, 'music', 'Test', undefined, 'suno')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'music' }
      })
      expect(transaction?.type).toBe('music')
    })

    it('piapi (suno wrapper) costs 10 credits', async () => {
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
    })
  })

  describe('Prompt Generation Costs', () => {
    it('prompt generation tracks cost', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(
        user.id,
        2,
        'prompt',
        'Master prompt generation',
        undefined,
        'claude-sdk',
        undefined,
        0.012
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'prompt' }
      })
      expect(transaction).toBeDefined()
      expect(transaction?.realCost).toBeCloseTo(0.012, 3)
    })
  })

  describe('Real Cost Constants', () => {
    it('has correct gemini image cost', () => {
      expect(ACTION_COSTS.image.gemini).toBe(0.24)
    })

    it('has correct modal image cost', () => {
      expect(ACTION_COSTS.image.modal).toBe(0.09)
    })

    it('has correct kie video cost', () => {
      expect(ACTION_COSTS.video.kie).toBe(0.10)
    })

    it('has correct modal video cost', () => {
      expect(ACTION_COSTS.video.modal).toBe(0.15)
    })

    it('has correct elevenlabs voice cost', () => {
      expect(ACTION_COSTS.voiceover.elevenlabs).toBe(0.03)
    })

    it('has correct gemini-tts voice cost', () => {
      expect(ACTION_COSTS.voiceover.geminiTts).toBe(0.002)
    })

    it('has correct suno music cost', () => {
      expect(ACTION_COSTS.music.suno).toBe(0.05)
    })

    it('has correct claude scene cost', () => {
      expect(ACTION_COSTS.scene.claude).toBe(0.01)
    })
  })

  describe('Cost Estimation Functions', () => {
    it('estimateCost returns correct structure', () => {
      const estimate = estimateCost('image', 'gemini', 5)
      expect(estimate).toMatchObject({
        action: 'image',
        provider: 'gemini',
        quantity: 5
      })
      expect(estimate.totalCost).toBe(estimate.cost * 5)
    })

    it('getActionCost returns fallback for unknown provider', () => {
      const cost = getActionCost('image', 'unknown' as any)
      expect(cost).toBe(0)
    })
  })

  describe('trackRealCostOnly', () => {
    it('tracks cost without deducting credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await trackRealCostOnly(
        user.id,
        0.24,
        'image',
        'Prepaid regeneration',
        undefined,
        'gemini',
        { prepaidRegeneration: true }
      )

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100) // Unchanged

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image', amount: 0 }
      })
      expect(transaction?.realCost).toBeCloseTo(0.24, 2)
    })

    it('creates transaction with 0 credit amount', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await trackRealCostOnly(
        user.id,
        0.10,
        'video',
        'Prepaid video',
        undefined,
        'kie'
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'video' }
      })
      expect(transaction?.amount).toBe(0)
    })
  })

  describe('Credit Transaction Amounts', () => {
    it('spendCredits creates negative transaction amount', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 27, 'image', 'Test')

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.amount).toBe(-27)
    })

    it('totalSpent is updated when spending credits', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100, totalSpent: 50 })

      await spendCredits(user.id, 27, 'image', 'Test')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.totalSpent).toBe(77)
    })
  })
})
