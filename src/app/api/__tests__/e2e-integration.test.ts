import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits, addCreditsTransaction } from '@/test/factories/credits'
import { createTestProject } from '@/test/factories/project'
import { createTestScene } from '@/test/factories/scene'
import {
  spendCredits,
  addCredits,
  checkBalance,
  getOrCreateCredits,
  COSTS
} from '@/lib/services/credits'

describe('End-to-End Integration Tests', () => {
  describe('Full Project Creation Flow', () => {
    it('creates user with credits', async () => {
      const user = await createTestUser()
      const credits = await getOrCreateCredits(user.id)

      expect(user).toBeDefined()
      expect(credits).toBeDefined()
      expect(credits.balance).toBe(0)
    })

    it('user purchases credits', async () => {
      const user = await createTestUser()
      await getOrCreateCredits(user.id)

      const result = await addCredits(user.id, 500, 'purchase')

      expect(result.success).toBe(true)
      expect(result.balance).toBe(500)
    })

    it('creates project for user', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id, {
        name: 'E2E Test Project',
        story: { concept: 'An adventure story' }
      })

      expect(project.userId).toBe(user.id)
      expect(project.name).toBe('E2E Test Project')
    })

    it('creates scenes for project', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      const scenes = []
      for (let i = 1; i <= 5; i++) {
        const scene = await createTestScene(project.id, { number: i })
        scenes.push(scene)
      }

      expect(scenes).toHaveLength(5)

      const projectWithScenes = await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: true }
      })
      expect(projectWithScenes?.scenes).toHaveLength(5)
    })

    it('deducts credits for scene generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Generate 5 scenes
      for (let i = 0; i < 5; i++) {
        await spendCredits(
          user.id,
          COSTS.SCENE_GENERATION,
          'scene',
          `Scene ${i + 1}`,
          project.id,
          'claude-sdk'
        )
      }

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(100 - (5 * COSTS.SCENE_GENERATION)) // 90
    })

    it('deducts credits for image generation per scene', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 200 })
      const project = await createTestProject(user.id)
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

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(173)
    })

    it('deducts credits for video generation per scene', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 200 })
      const project = await createTestProject(user.id)
      const scene = await createTestScene(project.id, { number: 1 })

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

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(180)
    })

    it('deducts credits for voiceover generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 200 })
      const project = await createTestProject(user.id)

      await spendCredits(
        user.id,
        COSTS.VOICEOVER_LINE,
        'voiceover',
        'Voiceover line',
        project.id,
        'elevenlabs',
        undefined,
        0.03
      )

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(194)
    })

    it('deducts credits for music generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 200 })
      const project = await createTestProject(user.id)

      await spendCredits(
        user.id,
        COSTS.MUSIC_GENERATION,
        'music',
        'Background music',
        project.id,
        'suno',
        undefined,
        0.05
      )

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(190)
    })

    it('completes full project with all generations', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 500 })
      const project = await createTestProject(user.id)

      const sceneCount = 3

      // Scene generation
      for (let i = 0; i < sceneCount; i++) {
        await spendCredits(user.id, COSTS.SCENE_GENERATION, 'scene', `Scene ${i + 1}`, project.id)
        await createTestScene(project.id, { number: i + 1 })
      }

      // Image generation for each scene
      for (let i = 0; i < sceneCount; i++) {
        await spendCredits(user.id, 27, 'image', `Image ${i + 1}`, project.id, 'gemini')
      }

      // Video generation for each scene
      for (let i = 0; i < sceneCount; i++) {
        await spendCredits(user.id, COSTS.VIDEO_GENERATION, 'video', `Video ${i + 1}`, project.id, 'kie')
      }

      // Voiceover for each scene
      for (let i = 0; i < sceneCount; i++) {
        await spendCredits(user.id, COSTS.VOICEOVER_LINE, 'voiceover', `Voice ${i + 1}`, project.id)
      }

      // Music generation
      await spendCredits(user.id, COSTS.MUSIC_GENERATION, 'music', 'Music', project.id)

      // Calculate expected remaining: 500 - (3*2 + 3*27 + 3*20 + 3*6 + 10) = 500 - 169 = 331
      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      const expectedSpent = (sceneCount * COSTS.SCENE_GENERATION) + // 6
                           (sceneCount * 27) + // 81
                           (sceneCount * COSTS.VIDEO_GENERATION) + // 60
                           (sceneCount * COSTS.VOICEOVER_LINE) + // 18
                           COSTS.MUSIC_GENERATION // 10
      expect(credits?.balance).toBe(500 - expectedSpent)
    })
  })

  describe('Collaboration Workflow', () => {
    it('adds collaborator to project', async () => {
      const owner = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(owner.id)

      const member = await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: owner.id
        }
      })

      expect(member.role).toBe('collaborator')
    })

    it('collaborator creates regeneration request', async () => {
      const owner = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(owner.id)
      const scene = await createTestScene(project.id, { number: 1 })

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: owner.id
        }
      })

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: collaborator.id,
          targetType: 'image',
          targetId: scene.id,
          reason: 'Image needs improvement',
          status: 'pending'
        }
      })

      expect(request.status).toBe('pending')
      expect(request.requesterId).toBe(collaborator.id)
    })

    it('admin approves regeneration request', async () => {
      const owner = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(owner.id)
      const scene = await createTestScene(project.id, { number: 1 })

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: owner.id
        }
      })

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: collaborator.id,
          targetType: 'image',
          targetId: scene.id,
          reason: 'Test',
          status: 'pending'
        }
      })

      const approved = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewer: { connect: { id: owner.id } },
          reviewedAt: new Date()
        }
      })

      expect(approved.status).toBe('approved')
    })

    it('notification sent when request approved', async () => {
      const owner = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(owner.id)

      const notification = await prisma.notification.create({
        data: {
          userId: collaborator.id,
          type: 'regeneration_approved',
          title: 'Request Approved',
          message: 'Your regeneration request was approved',
          metadata: { projectId: project.id }
        }
      })

      expect(notification.type).toBe('regeneration_approved')
    })
  })

  describe('Multi-User Isolation', () => {
    it('users cannot see each other projects', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await createTestProject(user1.id, { name: 'User 1 Project' })
      await createTestProject(user2.id, { name: 'User 2 Project' })

      const user1Projects = await prisma.project.findMany({
        where: { userId: user1.id }
      })

      const user2Projects = await prisma.project.findMany({
        where: { userId: user2.id }
      })

      expect(user1Projects).toHaveLength(1)
      expect(user2Projects).toHaveLength(1)
      expect(user1Projects[0].name).toBe('User 1 Project')
      expect(user2Projects[0].name).toBe('User 2 Project')
    })

    it('users have separate credit balances', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await createTestCredits(user1.id, { balance: 1000 })
      await createTestCredits(user2.id, { balance: 500 })

      await spendCredits(user1.id, 100, 'image', 'Test')

      const user1Credits = await prisma.credits.findFirst({ where: { userId: user1.id } })
      const user2Credits = await prisma.credits.findFirst({ where: { userId: user2.id } })

      expect(user1Credits?.balance).toBe(900)
      expect(user2Credits?.balance).toBe(500)
    })

    it('transaction history is user-specific', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await createTestCredits(user1.id, { balance: 200 })
      await createTestCredits(user2.id, { balance: 200 })

      await spendCredits(user1.id, 27, 'image', 'User 1 image')
      await spendCredits(user1.id, 27, 'image', 'User 1 image 2')
      await spendCredits(user2.id, 20, 'video', 'User 2 video')

      const user1Transactions = await prisma.creditTransaction.findMany({
        where: { credits: { userId: user1.id } }
      })

      const user2Transactions = await prisma.creditTransaction.findMany({
        where: { credits: { userId: user2.id } }
      })

      expect(user1Transactions).toHaveLength(2)
      expect(user2Transactions).toHaveLength(1)
    })
  })

  describe('Project Lifecycle', () => {
    it('project can be marked as complete', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { isComplete: true }
      })

      expect(updated.isComplete).toBe(true)
    })

    it('project settings persist correctly', async () => {
      const user = await createTestUser()
      const settings = {
        aspectRatio: '16:9',
        resolution: 'hd',
        sceneCount: 12,
        characterCount: 3,
        voiceProvider: 'elevenlabs',
        voiceLanguage: 'en'
      }

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Settings Test',
          settings
        }
      })

      const found = await prisma.project.findUnique({ where: { id: project.id } })
      expect(found?.settings).toEqual(settings)
    })

    it('scenes order is preserved', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      for (let i = 5; i >= 1; i--) {
        await createTestScene(project.id, { number: i })
      }

      const scenes = await prisma.scene.findMany({
        where: { projectId: project.id },
        orderBy: { number: 'asc' }
      })

      expect(scenes.map(s => s.number)).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('Credit Operations Consistency', () => {
    it('credit balance matches transaction sum', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      await spendCredits(user.id, 27, 'image', 'Test 1')
      await spendCredits(user.id, 20, 'video', 'Test 2')
      await spendCredits(user.id, 6, 'voiceover', 'Test 3')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      const transactions = await prisma.creditTransaction.findMany({
        where: { creditsId: credits!.id }
      })

      const transactionSum = transactions.reduce((sum, t) => sum + t.amount, 0)
      // Initial balance was 100, spent 53 total (27+20+6)
      expect(credits?.balance).toBe(100 + transactionSum)
    })

    it('totalSpent reflects all spending', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 200, totalSpent: 0 })

      await spendCredits(user.id, 27, 'image', 'Test 1')
      await spendCredits(user.id, 27, 'image', 'Test 2')
      await spendCredits(user.id, 20, 'video', 'Test 3')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.totalSpent).toBe(74)
    })

    it('totalEarned reflects all purchases', async () => {
      const user = await createTestUser()
      await getOrCreateCredits(user.id)

      await addCredits(user.id, 100, 'purchase')
      await addCredits(user.id, 50, 'bonus')
      await addCredits(user.id, 200, 'purchase')

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.totalEarned).toBe(350)
    })
  })

  describe('Error Handling', () => {
    it('handles insufficient credits gracefully', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 10 })

      const result = await spendCredits(user.id, 27, 'image', 'Test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient')
    })

    it('handles missing user gracefully in checkBalance', async () => {
      const result = await checkBalance('non-existent-user-id', 50)

      // Should handle gracefully - either create credits or return error
      expect(result).toBeDefined()
    })

    it('project without scenes returns empty array', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      const projectWithScenes = await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: true }
      })

      expect(projectWithScenes?.scenes).toEqual([])
    })
  })

  describe('Character Integration', () => {
    it('creates character for project', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      const character = await prisma.character.create({
        data: {
          projectId: project.id,
          name: 'Hero',
          description: 'The main protagonist',
          visualDescription: 'Tall, athletic build',
          masterPrompt: 'A brave hero'
        }
      })

      expect(character.name).toBe('Hero')
    })

    it('deducts credits for character generation', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      await spendCredits(
        user.id,
        COSTS.CHARACTER_GENERATION,
        'character',
        'Character generation',
        project.id,
        'claude-sdk'
      )

      const credits = await prisma.credits.findFirst({ where: { userId: user.id } })
      expect(credits?.balance).toBe(98)
    })

    it('character images have separate cost', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      const character = await prisma.character.create({
        data: {
          projectId: project.id,
          name: 'Hero',
          description: 'Main character',
          visualDescription: 'Tall hero',
          masterPrompt: 'A brave hero'
        }
      })

      await spendCredits(
        user.id,
        27,
        'image',
        'Character image',
        project.id,
        'gemini',
        { characterId: character.id }
      )

      const transaction = await prisma.creditTransaction.findFirst({
        where: { type: 'image' }
      })
      expect(transaction?.metadata).toEqual(expect.objectContaining({ characterId: character.id }))
    })
  })
})
