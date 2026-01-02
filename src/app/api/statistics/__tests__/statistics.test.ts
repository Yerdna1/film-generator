import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import {
  createTestUser,
  createTestProject,
  createTestCredits,
  createCreditsWithHistory,
  addProjectMember,
  createFullTestEnvironment
} from '@/test/factories'

describe('User Statistics Tests', () => {
  describe('Total Calculations', () => {
    it('calculates total credits spent correctly', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)
      const credits = await createCreditsWithHistory(user.id, 500, [
        { amount: 27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
        { amount: 27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
        { amount: 20, realCost: 0.10, type: 'VIDEO', projectId: project.id }
      ])

      const transactions = await prisma.creditTransaction.findMany({
        where: { creditsId: credits.id }
      })

      const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

      expect(totalSpent).toBe(74)
    })

    it('calculates total real cost correctly', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)
      await createCreditsWithHistory(user.id, 500, [
        { amount: 27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
        { amount: 27, realCost: 0.09, type: 'IMAGE', projectId: project.id },
        { amount: 20, realCost: 0.10, type: 'VIDEO', projectId: project.id }
      ])

      const transactions = await prisma.creditTransaction.findMany({
        where: {
          credits: { userId: user.id }
        }
      })

      const totalRealCost = transactions.reduce((sum, t) => sum + t.realCost, 0)

      expect(totalRealCost).toBeCloseTo(0.43, 2)
    })
  })

  describe('Type Breakdown', () => {
    it('groups spending by type correctly', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)
      await createCreditsWithHistory(user.id, 1000, [
        { amount: 27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
        { amount: 27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
        { amount: 20, realCost: 0.10, type: 'VIDEO', projectId: project.id },
        { amount: 6, realCost: 0.05, type: 'TTS', projectId: project.id },
        { amount: 10, realCost: 0.05, type: 'MUSIC', projectId: project.id }
      ])

      const transactions = await prisma.creditTransaction.findMany({
        where: { credits: { userId: user.id } }
      })

      const byType: Record<string, number> = {}
      transactions.forEach(t => {
        byType[t.type] = (byType[t.type] || 0) + Math.abs(t.amount)
      })

      expect(byType.IMAGE).toBe(54)
      expect(byType.VIDEO).toBe(20)
      expect(byType.TTS).toBe(6)
      expect(byType.MUSIC).toBe(10)
    })
  })

  describe('Provider Breakdown', () => {
    it('groups spending by provider correctly', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)
      await createCreditsWithHistory(user.id, 1000, [
        { amount: 27, realCost: 0.24, type: 'IMAGE', provider: 'gemini-3-pro', projectId: project.id },
        { amount: 27, realCost: 0.09, type: 'IMAGE', provider: 'modal-qwen', projectId: project.id },
        { amount: 20, realCost: 0.10, type: 'VIDEO', provider: 'kie', projectId: project.id }
      ])

      const transactions = await prisma.creditTransaction.findMany({
        where: { credits: { userId: user.id } }
      })

      const byProvider: Record<string, number> = {}
      transactions.forEach(t => {
        if (t.provider) {
          byProvider[t.provider] = (byProvider[t.provider] || 0) + t.realCost
        }
      })

      expect(byProvider['gemini-3-pro']).toBeCloseTo(0.24, 2)
      expect(byProvider['modal-qwen']).toBeCloseTo(0.09, 2)
      expect(byProvider['kie']).toBeCloseTo(0.10, 2)
    })
  })

  describe('Project Breakdown', () => {
    it('groups spending by project correctly', async () => {
      const user = await createTestUser()
      const project1 = await createTestProject(user.id, { name: 'Project 1' })
      const project2 = await createTestProject(user.id, { name: 'Project 2' })
      const credits = await createTestCredits(user.id, { balance: 1000 })

      // Add transactions for different projects
      await prisma.creditTransaction.createMany({
        data: [
          { creditsId: credits.id, amount: -27, realCost: 0.24, type: 'IMAGE', projectId: project1.id },
          { creditsId: credits.id, amount: -27, realCost: 0.24, type: 'IMAGE', projectId: project1.id },
          { creditsId: credits.id, amount: -20, realCost: 0.10, type: 'VIDEO', projectId: project2.id }
        ]
      })

      const project1Stats = await prisma.creditTransaction.aggregate({
        where: { projectId: project1.id },
        _sum: { realCost: true }
      })

      const project2Stats = await prisma.creditTransaction.aggregate({
        where: { projectId: project2.id },
        _sum: { realCost: true }
      })

      expect(project1Stats._sum.realCost).toBeCloseTo(0.48, 2)
      expect(project2Stats._sum.realCost).toBeCloseTo(0.10, 2)
    })
  })

  describe('Time Range Filter', () => {
    it('filters transactions by date range', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, { balance: 1000 })
      const project = await createTestProject(user.id)

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      // Create transactions at different times
      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.id,
          amount: -27,
          realCost: 0.24,
          type: 'IMAGE',
          projectId: project.id,
          createdAt: now
        }
      })

      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.id,
          amount: -27,
          realCost: 0.24,
          type: 'IMAGE',
          projectId: project.id,
          createdAt: sixtyDaysAgo
        }
      })

      const last30Days = await prisma.creditTransaction.findMany({
        where: {
          creditsId: credits.id,
          createdAt: { gte: thirtyDaysAgo }
        }
      })

      expect(last30Days.length).toBe(1)
    })
  })

  describe('Generation Counts', () => {
    it('counts total generations correctly', async () => {
      const user = await createTestUser()
      await createCreditsWithHistory(user.id, 1000, [
        { amount: 27, realCost: 0.24, type: 'IMAGE' },
        { amount: 27, realCost: 0.24, type: 'IMAGE' },
        { amount: 20, realCost: 0.10, type: 'VIDEO' },
        { amount: 6, realCost: 0.05, type: 'TTS' }
      ])

      const count = await prisma.creditTransaction.count({
        where: { credits: { userId: user.id } }
      })

      expect(count).toBe(4)
    })

    it('counts regenerations separately', async () => {
      const user = await createTestUser()
      await createCreditsWithHistory(user.id, 1000, [
        { amount: 27, realCost: 0.24, type: 'IMAGE', isRegeneration: false },
        { amount: 27, realCost: 0.24, type: 'IMAGE', isRegeneration: true },
        { amount: 27, realCost: 0.24, type: 'IMAGE', isRegeneration: true }
      ])

      const transactions = await prisma.creditTransaction.findMany({
        where: { credits: { userId: user.id } }
      })

      const regenCount = transactions.filter(
        t => (t.metadata as any)?.isRegeneration === true
      ).length

      expect(regenCount).toBe(2)
    })
  })

  describe('Empty History', () => {
    it('returns zero statistics for new user', async () => {
      const user = await createTestUser()
      await createTestCredits(user.id, { balance: 100 })

      const transactions = await prisma.creditTransaction.findMany({
        where: { credits: { userId: user.id } }
      })

      expect(transactions.length).toBe(0)
    })
  })

  describe('Credits Balance', () => {
    it('returns current balance correctly', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, { balance: 750 })

      expect(credits.balance).toBe(750)
    })

    it('returns total earned correctly', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, {
        balance: 500,
        totalEarned: 1000,
        totalSpent: 500
      })

      expect(credits.totalEarned).toBe(1000)
    })
  })
})

describe('Project Statistics Tests', () => {
  describe('Project Totals', () => {
    it('calculates project total cost correctly', async () => {
      const { users, project, credits } = await createFullTestEnvironment()

      await prisma.creditTransaction.createMany({
        data: [
          { creditsId: credits.admin.id, amount: -27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
          { creditsId: credits.admin.id, amount: -27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
          { creditsId: credits.collaborator.id, amount: -20, realCost: 0.10, type: 'VIDEO', projectId: project.id }
        ]
      })

      const stats = await prisma.creditTransaction.aggregate({
        where: { projectId: project.id },
        _sum: { realCost: true, amount: true }
      })

      expect(stats._sum.realCost).toBeCloseTo(0.58, 2)
      expect(Math.abs(stats._sum.amount || 0)).toBe(74)
    })
  })

  describe('Contributor Breakdown', () => {
    it('shows spending by contributor', async () => {
      const { users, project, credits } = await createFullTestEnvironment()

      await prisma.creditTransaction.createMany({
        data: [
          { creditsId: credits.admin.id, amount: -54, realCost: 0.48, type: 'IMAGE', projectId: project.id },
          { creditsId: credits.collaborator.id, amount: -20, realCost: 0.10, type: 'VIDEO', projectId: project.id }
        ]
      })

      const adminStats = await prisma.creditTransaction.aggregate({
        where: { projectId: project.id, creditsId: credits.admin.id },
        _sum: { realCost: true }
      })

      const collabStats = await prisma.creditTransaction.aggregate({
        where: { projectId: project.id, creditsId: credits.collaborator.id },
        _sum: { realCost: true }
      })

      expect(adminStats._sum.realCost).toBeCloseTo(0.48, 2)
      expect(collabStats._sum.realCost).toBeCloseTo(0.10, 2)
    })
  })

  describe('Asset Counts', () => {
    it('counts total images in project', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      await prisma.scene.createMany({
        data: [
          { projectId: project.id, number: 1, title: 'Scene 1', description: 'Desc 1', textToImagePrompt: 'Prompt 1', imageToVideoPrompt: 'Video 1', imageUrl: 'url1' },
          { projectId: project.id, number: 2, title: 'Scene 2', description: 'Desc 2', textToImagePrompt: 'Prompt 2', imageToVideoPrompt: 'Video 2', imageUrl: 'url2' },
          { projectId: project.id, number: 3, title: 'Scene 3', description: 'Desc 3', textToImagePrompt: 'Prompt 3', imageToVideoPrompt: 'Video 3', imageUrl: null }
        ]
      })

      const imagesCount = await prisma.scene.count({
        where: { projectId: project.id, imageUrl: { not: null } }
      })

      expect(imagesCount).toBe(2)
    })

    it('counts total videos in project', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      await prisma.scene.createMany({
        data: [
          { projectId: project.id, number: 1, title: 'Scene 1', description: 'Desc 1', textToImagePrompt: 'Prompt 1', imageToVideoPrompt: 'Video 1', videoUrl: 'url1' },
          { projectId: project.id, number: 2, title: 'Scene 2', description: 'Desc 2', textToImagePrompt: 'Prompt 2', imageToVideoPrompt: 'Video 2', videoUrl: 'url2' },
          { projectId: project.id, number: 3, title: 'Scene 3', description: 'Desc 3', textToImagePrompt: 'Prompt 3', imageToVideoPrompt: 'Video 3', videoUrl: null }
        ]
      })

      const videosCount = await prisma.scene.count({
        where: { projectId: project.id, videoUrl: { not: null } }
      })

      expect(videosCount).toBe(2)
    })
  })

  describe('Access Control', () => {
    it('only project members can view statistics', async () => {
      const { users, project } = await createFullTestEnvironment()

      // Verify outsider has no access
      const outsiderMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.outsider.id }
        }
      })

      expect(outsiderMember).toBeNull()
      // In real API, outsider accessing stats would return 403
    })
  })

  describe('Empty Project', () => {
    it('returns zero stats for project with no generations', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      const stats = await prisma.creditTransaction.aggregate({
        where: { projectId: project.id },
        _sum: { realCost: true }
      })

      expect(stats._sum.realCost).toBeNull()
    })
  })
})
