import { describe, it, expect } from 'vitest'
import {
  getImageCost,
  getActionCost,
  estimateCost,
  estimateProjectCost,
  calculateVoiceCost,
  estimateScenesCost,
  estimateImagesCost,
  estimateVideosCost,
  estimateVoiceoversCost,
  PROVIDER_COSTS,
  ACTION_COSTS,
  IMAGE_RESOLUTIONS,
  ASPECT_RATIOS,
  type ImageResolution,
  type ActionType,
  type Provider
} from '../real-costs'

describe('Real Costs Service', () => {
  describe('getImageCost', () => {
    it('returns correct cost for 1k resolution', () => {
      const cost = getImageCost('1k')
      expect(cost).toBe(PROVIDER_COSTS.gemini.image1k2k)
    })

    it('returns correct cost for 2k resolution', () => {
      const cost = getImageCost('2k')
      expect(cost).toBe(PROVIDER_COSTS.gemini.image1k2k)
    })

    it('returns correct cost for 4k resolution', () => {
      const cost = getImageCost('4k')
      expect(cost).toBe(PROVIDER_COSTS.gemini.image4k)
    })

    it('defaults to 2k resolution when not specified', () => {
      const cost = getImageCost()
      expect(cost).toBe(PROVIDER_COSTS.gemini.image1k2k)
    })
  })

  describe('getActionCost', () => {
    it('returns correct cost for image generation with gemini', () => {
      const cost = getActionCost('image', 'gemini')
      expect(cost).toBeGreaterThan(0)
    })

    it('returns correct cost for video generation with grok', () => {
      const cost = getActionCost('video', 'grok')
      expect(cost).toBeGreaterThan(0)
    })

    it('returns correct cost for voiceover with elevenlabs', () => {
      const cost = getActionCost('voiceover', 'elevenlabs')
      expect(cost).toBeGreaterThan(0)
    })

    it('returns correct cost for scene generation with claude', () => {
      const cost = getActionCost('scene', 'claude')
      expect(cost).toBeGreaterThan(0)
    })

    it('returns correct cost for music with suno', () => {
      const cost = getActionCost('music', 'suno')
      expect(cost).toBeGreaterThan(0)
    })

    it('returns 0 for unknown provider', () => {
      const cost = getActionCost('image', 'unknown' as Provider)
      expect(cost).toBe(0)
    })
  })

  describe('calculateVoiceCost', () => {
    it('calculates elevenlabs cost correctly', () => {
      const cost = calculateVoiceCost(1000, 'elevenlabs')
      expect(cost).toBe(PROVIDER_COSTS.elevenlabs.voicePer1K)
    })

    it('applies minimum charge for small requests', () => {
      const cost = calculateVoiceCost(10, 'elevenlabs')
      expect(cost).toBe(PROVIDER_COSTS.elevenlabs.minCharge)
    })

    it('calculates gemini TTS cost correctly', () => {
      const cost = calculateVoiceCost(1000, 'geminiTts')
      expect(cost).toBe(PROVIDER_COSTS.gemini.ttsPer1K)
    })
  })

  describe('estimateCost', () => {
    it('returns correct CostEstimate structure', () => {
      const estimate = estimateCost('image', 'gemini', 1)

      expect(estimate).toHaveProperty('action', 'image')
      expect(estimate).toHaveProperty('provider', 'gemini')
      expect(estimate).toHaveProperty('cost')
      expect(estimate).toHaveProperty('quantity', 1)
      expect(estimate).toHaveProperty('totalCost')
    })

    it('multiplies unit cost by quantity correctly', () => {
      const singleCost = estimateCost('image', 'gemini', 1)
      const fiveCost = estimateCost('image', 'gemini', 5)

      expect(fiveCost.totalCost).toBeCloseTo(singleCost.cost * 5, 2)
    })

    it('handles zero quantity', () => {
      const estimate = estimateCost('image', 'gemini', 0)

      expect(estimate.quantity).toBe(0)
      expect(estimate.totalCost).toBe(0)
    })

    it('defaults quantity to 1', () => {
      const estimate = estimateCost('image', 'gemini')

      expect(estimate.quantity).toBe(1)
    })
  })

  describe('estimateScenesCost', () => {
    it('returns estimate for scene generation', () => {
      const estimate = estimateScenesCost(10, 'claude')

      expect(estimate.action).toBe('scene')
      expect(estimate.quantity).toBe(10)
      expect(estimate.totalCost).toBeGreaterThan(0)
    })

    it('defaults to claude provider', () => {
      const estimate = estimateScenesCost(10)

      expect(estimate.provider).toBe('claude')
    })
  })

  describe('estimateImagesCost', () => {
    it('returns estimate for image generation', () => {
      const estimate = estimateImagesCost(20, 'gemini')

      expect(estimate.action).toBe('image')
      expect(estimate.quantity).toBe(20)
      expect(estimate.totalCost).toBeGreaterThan(0)
    })

    it('defaults to gemini provider', () => {
      const estimate = estimateImagesCost(20)

      expect(estimate.provider).toBe('gemini')
    })
  })

  describe('estimateVideosCost', () => {
    it('returns estimate for video generation', () => {
      const estimate = estimateVideosCost(15, 'grok')

      expect(estimate.action).toBe('video')
      expect(estimate.quantity).toBe(15)
      expect(estimate.totalCost).toBeGreaterThan(0)
    })

    it('defaults to grok provider', () => {
      const estimate = estimateVideosCost(15)

      expect(estimate.provider).toBe('grok')
    })
  })

  describe('estimateVoiceoversCost', () => {
    it('returns estimate for voiceover generation', () => {
      const estimate = estimateVoiceoversCost(30, 'elevenlabs')

      expect(estimate.action).toBe('voiceover')
      expect(estimate.quantity).toBe(30)
      expect(estimate.totalCost).toBeGreaterThan(0)
    })

    it('defaults to elevenlabs provider', () => {
      const estimate = estimateVoiceoversCost(30)

      expect(estimate.provider).toBe('elevenlabs')
    })
  })

  describe('estimateProjectCost', () => {
    it('calculates all components for a full project', () => {
      const estimate = estimateProjectCost({
        sceneCount: 10,
        characterCount: 5,
        dialogueLineCount: 30,
        imageProvider: 'gemini',
        videoProvider: 'grok',
        voiceProvider: 'elevenlabs',
        sceneProvider: 'claude'
      })

      expect(estimate.total).toBeGreaterThan(0)
      expect(estimate.breakdown.images.totalCost).toBeGreaterThan(0)
      expect(estimate.breakdown.videos.totalCost).toBeGreaterThan(0)
      expect(estimate.breakdown.voiceovers.totalCost).toBeGreaterThan(0)
      expect(estimate.breakdown.scenes.totalCost).toBeGreaterThan(0)
    })

    it('breakdown total equals sum of parts', () => {
      const estimate = estimateProjectCost({
        sceneCount: 10,
        characterCount: 5,
        dialogueLineCount: 30
      })

      const sumOfParts =
        estimate.breakdown.prompt.totalCost +
        estimate.breakdown.characters.totalCost +
        estimate.breakdown.scenes.totalCost +
        estimate.breakdown.images.totalCost +
        estimate.breakdown.videos.totalCost +
        estimate.breakdown.voiceovers.totalCost

      expect(estimate.total).toBeCloseTo(sumOfParts, 4)
    })

    it('uses default providers when not specified', () => {
      const estimate = estimateProjectCost({
        sceneCount: 5,
        characterCount: 2,
        dialogueLineCount: 10
      })

      expect(estimate.breakdown.images.provider).toBe('gemini')
      expect(estimate.breakdown.videos.provider).toBe('grok')
      expect(estimate.breakdown.scenes.provider).toBe('claude')
    })
  })

  describe('PROVIDER_COSTS constants', () => {
    it('has all required providers defined', () => {
      expect(PROVIDER_COSTS.gemini).toBeDefined()
      expect(PROVIDER_COSTS.geminiFlash).toBeDefined()
      expect(PROVIDER_COSTS.elevenlabs).toBeDefined()
      expect(PROVIDER_COSTS.grok).toBeDefined()
      expect(PROVIDER_COSTS.claude).toBeDefined()
      expect(PROVIDER_COSTS.suno).toBeDefined()
      expect(PROVIDER_COSTS.modal).toBeDefined()
    })

    it('gemini has required pricing fields', () => {
      expect(PROVIDER_COSTS.gemini.image1k2k).toBeGreaterThan(0)
      expect(PROVIDER_COSTS.gemini.image4k).toBeGreaterThan(0)
      expect(PROVIDER_COSTS.gemini.ttsPer1K).toBeGreaterThan(0)
    })

    it('elevenlabs has required pricing fields', () => {
      expect(PROVIDER_COSTS.elevenlabs.voicePer1K).toBeGreaterThan(0)
      expect(PROVIDER_COSTS.elevenlabs.minCharge).toBeGreaterThan(0)
    })

    it('modal has required pricing fields', () => {
      expect(PROVIDER_COSTS.modal.imageGeneration).toBeGreaterThan(0)
      expect(PROVIDER_COSTS.modal.videoGeneration).toBeGreaterThan(0)
      expect(PROVIDER_COSTS.modal.ttsPerSecond).toBeGreaterThan(0)
    })
  })

  describe('ACTION_COSTS constants', () => {
    it('has all action types defined', () => {
      expect(ACTION_COSTS.image).toBeDefined()
      expect(ACTION_COSTS.video).toBeDefined()
      expect(ACTION_COSTS.voiceover).toBeDefined()
      expect(ACTION_COSTS.scene).toBeDefined()
      expect(ACTION_COSTS.character).toBeDefined()
      expect(ACTION_COSTS.prompt).toBeDefined()
      expect(ACTION_COSTS.music).toBeDefined()
    })

    it('image costs has multiple providers', () => {
      expect(ACTION_COSTS.image.gemini).toBeGreaterThan(0)
      expect(ACTION_COSTS.image.modal).toBeGreaterThan(0)
    })

    it('video costs has multiple providers', () => {
      expect(ACTION_COSTS.video.grok).toBeGreaterThan(0)
      expect(ACTION_COSTS.video.kie).toBeGreaterThan(0)
    })

    it('voiceover costs has multiple providers', () => {
      expect(ACTION_COSTS.voiceover.elevenlabs).toBeGreaterThan(0)
      expect(ACTION_COSTS.voiceover.modal).toBeGreaterThan(0)
    })
  })

  describe('IMAGE_RESOLUTIONS constants', () => {
    it('has all resolution options defined', () => {
      expect(IMAGE_RESOLUTIONS['1k']).toBeDefined()
      expect(IMAGE_RESOLUTIONS['2k']).toBeDefined()
      expect(IMAGE_RESOLUTIONS['4k']).toBeDefined()
    })

    it('each resolution has label and description', () => {
      expect(IMAGE_RESOLUTIONS['2k'].label).toBe('2K')
      expect(IMAGE_RESOLUTIONS['2k'].description).toBeDefined()
      expect(IMAGE_RESOLUTIONS['2k'].maxPixels).toBeDefined()
    })
  })

  describe('ASPECT_RATIOS constants', () => {
    it('has all aspect ratio options defined', () => {
      expect(ASPECT_RATIOS['1:1']).toBeDefined()
      expect(ASPECT_RATIOS['16:9']).toBeDefined()
      expect(ASPECT_RATIOS['9:16']).toBeDefined()
      expect(ASPECT_RATIOS['4:3']).toBeDefined()
      expect(ASPECT_RATIOS['3:4']).toBeDefined()
    })

    it('each ratio has label and description', () => {
      expect(ASPECT_RATIOS['16:9'].label).toBe('Landscape (16:9)')
      expect(ASPECT_RATIOS['16:9'].description).toBeDefined()
    })
  })
})
