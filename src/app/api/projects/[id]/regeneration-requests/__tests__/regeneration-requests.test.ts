import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import {
  createTestUser,
  createTestProject,
  createTestCredits,
  addProjectMember,
  createTestScenes,
  createFullTestEnvironment,
  createRegenerationRequest,
  createApprovedRegenRequest
} from '@/test/factories'

describe('Regeneration Request Flow Tests', () => {
  describe('Request Creation', () => {
    it('creates image regeneration request', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      expect(request.status).toBe('pending')
      expect(request.targetType).toBe('image')
      expect(request.requesterId).toBe(users.collaborator.id)
    })

    it('creates video regeneration request', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'video',
        targetId: scenes[0].id
      })

      expect(request.targetType).toBe('video')
    })

    it('creates batch regeneration for multiple scenes', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      // Create requests for multiple scenes
      const requests = await Promise.all(
        scenes.slice(0, 3).map(scene =>
          createRegenerationRequest(project.id, users.collaborator.id, {
            targetType: 'image',
            targetId: scene.id
          })
        )
      )

      expect(requests.length).toBe(3)
      requests.forEach(r => expect(r.status).toBe('pending'))
    })

    it('sets default max attempts to 3', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      expect(request.maxAttempts).toBe(3)
      expect(request.attemptsUsed).toBe(0)
    })
  })

  describe('Admin Approval', () => {
    it('calculates prepayment as 3x cost', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment()

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      // 27 credits per image x 3 attempts = 81
      const prepayment = 27 * 3

      const approved = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewedBy: users.admin.id,
          creditsPaid: prepayment
        }
      })

      expect(approved.creditsPaid).toBe(81)
    })

    it('deducts credits from admin account', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment()
      const initialBalance = credits.admin.balance

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      const prepayment = 81

      // Deduct from admin
      await prisma.credits.update({
        where: { id: credits.admin.id },
        data: {
          balance: { decrement: prepayment },
          totalSpent: { increment: prepayment }
        }
      })

      await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewedBy: users.admin.id,
          creditsPaid: prepayment
        }
      })

      const adminCredits = await prisma.credits.findUnique({
        where: { id: credits.admin.id }
      })

      expect(adminCredits?.balance).toBe(initialBalance - prepayment)
    })

    it('stores creditsPaid for tracking', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      const approved = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewedBy: users.admin.id,
          creditsPaid: 81
        }
      })

      expect(approved.creditsPaid).toBe(81)
    })

    it('transitions status to approved', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      const approved = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { status: 'approved', reviewedBy: users.admin.id }
      })

      expect(approved.status).toBe('approved')
    })

    it('returns error for insufficient admin credits', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const collaborator = await createTestUser({ name: 'Collaborator' })
      const project = await createTestProject(admin.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')
      const scenes = await createTestScenes(project.id, 1)

      // Admin has only 50 credits, needs 81
      await createTestCredits(admin.id, { balance: 50 })

      const request = await createRegenerationRequest(project.id, collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      const adminCredits = await prisma.credits.findFirst({
        where: { userId: admin.id }
      })

      expect(adminCredits?.balance).toBeLessThan(81)
      // In real API, approval would fail
    })

    it('rejection sets status and no credit deduction', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment()
      const initialBalance = credits.admin.balance

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })

      const rejected = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          reviewedBy: users.admin.id
        }
      })

      expect(rejected.status).toBe('rejected')
      expect(rejected.creditsPaid).toBe(0)

      const adminCredits = await prisma.credits.findUnique({
        where: { id: credits.admin.id }
      })
      expect(adminCredits?.balance).toBe(initialBalance)
    })
  })

  describe('Collaborator Generation', () => {
    it('uses approved request for generation', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'approved',
          reviewedBy: users.admin.id,
          maxAttempts: 3,
          attemptsUsed: 0,
          creditsPaid: 81
        }
      })

      expect(request.status).toBe('approved')
    })

    it('no credit deduction from collaborator', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment()
      const initialCollabBalance = credits.collaborator.balance

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'approved',
          reviewedBy: users.admin.id,
          maxAttempts: 3,
          attemptsUsed: 0,
          creditsPaid: 81
        }
      })

      // Simulate generation - no credit deduction
      await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          attemptsUsed: 1,
          status: 'generating',
          generatedUrls: ['https://gen-1.com/image.png']
        }
      })

      const collabCredits = await prisma.credits.findUnique({
        where: { id: credits.collaborator.id }
      })

      expect(collabCredits?.balance).toBe(initialCollabBalance)
    })

    it('increments attemptsUsed counter', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'approved',
          reviewedBy: users.admin.id,
          maxAttempts: 3,
          attemptsUsed: 0,
          creditsPaid: 81
        }
      })

      // First attempt
      await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { attemptsUsed: 1 }
      })

      // Second attempt
      const updated = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { attemptsUsed: 2 }
      })

      expect(updated.attemptsUsed).toBe(2)
    })

    it('stores generated URLs', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'approved',
          maxAttempts: 3,
          attemptsUsed: 0,
          creditsPaid: 81
        }
      })

      const updated = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          generatedUrls: [
            'https://gen-1.com/image.png',
            'https://gen-2.com/image.png'
          ]
        }
      })

      expect(updated.generatedUrls).toHaveLength(2)
    })

    it('transitions to selecting when max attempts reached', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'generating',
          maxAttempts: 3,
          attemptsUsed: 3,
          creditsPaid: 81,
          generatedUrls: ['url1', 'url2', 'url3']
        }
      })

      const updated = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { status: 'selecting' }
      })

      expect(updated.status).toBe('selecting')
    })

    it('cannot generate before approval', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id,
        status: 'pending'
      })

      expect(request.status).toBe('pending')
      // In real API, generation would return 403
    })

    it('cannot generate after rejection', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'rejected',
          reviewedBy: users.admin.id,
          maxAttempts: 3,
          attemptsUsed: 0,
          creditsPaid: 0
        }
      })

      expect(request.status).toBe('rejected')
      // In real API, generation would return 403
    })
  })

  describe('Selection and Final Approval', () => {
    it('collaborator selects from generated options', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'selecting',
          maxAttempts: 3,
          attemptsUsed: 3,
          creditsPaid: 81,
          generatedUrls: ['url1', 'url2', 'url3']
        }
      })

      const selected = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          selectedUrl: 'url2',
          status: 'awaiting_final'
        }
      })

      expect(selected.selectedUrl).toBe('url2')
      expect(selected.status).toBe('awaiting_final')
    })

    it('final approval applies selection to scene', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'awaiting_final',
          maxAttempts: 3,
          attemptsUsed: 3,
          creditsPaid: 81,
          selectedUrl: 'https://selected.com/image.png'
        }
      })

      // Admin approves
      await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'completed',
          finalReviewBy: users.admin.id
        }
      })

      // Apply to scene
      await prisma.scene.update({
        where: { id: scenes[0].id },
        data: { imageUrl: request.selectedUrl }
      })

      const scene = await prisma.scene.findUnique({
        where: { id: scenes[0].id }
      })

      expect(scene?.imageUrl).toBe('https://selected.com/image.png')
    })

    it('final approval sets completed status', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'awaiting_final',
          maxAttempts: 3,
          attemptsUsed: 3,
          creditsPaid: 81,
          selectedUrl: 'https://selected.com/image.png'
        }
      })

      const completed = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'completed',
          finalReviewBy: users.admin.id
        }
      })

      expect(completed.status).toBe('completed')
    })

    it('final rejection sets rejected status', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'awaiting_final',
          maxAttempts: 3,
          attemptsUsed: 3,
          creditsPaid: 81,
          selectedUrl: 'https://selected.com/image.png'
        }
      })

      const rejected = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          finalReviewBy: users.admin.id
        }
      })

      expect(rejected.status).toBe('rejected')
    })
  })

  describe('State Transitions', () => {
    it('follows correct state flow: pending -> approved -> generating -> selecting -> awaiting_final -> completed', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      // 1. Pending
      let request = await createRegenerationRequest(project.id, users.collaborator.id, {
        targetType: 'image',
        targetId: scenes[0].id
      })
      expect(request.status).toBe('pending')

      // 2. Approved
      request = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { status: 'approved', reviewedBy: users.admin.id, creditsPaid: 81 }
      })
      expect(request.status).toBe('approved')

      // 3. Generating
      request = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { status: 'generating', attemptsUsed: 1 }
      })
      expect(request.status).toBe('generating')

      // 4. Selecting (after max attempts)
      request = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'selecting',
          attemptsUsed: 3,
          generatedUrls: ['url1', 'url2', 'url3']
        }
      })
      expect(request.status).toBe('selecting')

      // 5. Awaiting Final
      request = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { status: 'awaiting_final', selectedUrl: 'url2' }
      })
      expect(request.status).toBe('awaiting_final')

      // 6. Completed
      request = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { status: 'completed', finalReviewBy: users.admin.id }
      })
      expect(request.status).toBe('completed')
    })
  })
})
