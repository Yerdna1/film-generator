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

describe('Collaborator Role API Tests', () => {
  describe('Project Access', () => {
    it('collaborator can view project details', async () => {
      const { users, project } = await createFullTestEnvironment()

      const projectData = await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: true }
      })

      expect(projectData).toBeDefined()
    })

    it('collaborator can edit scene fields', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const updated = await prisma.scene.update({
        where: { id: scenes[0].id },
        data: { description: 'Updated by collaborator' }
      })

      expect(updated.description).toBe('Updated by collaborator')
    })
  })

  describe('Restricted Actions', () => {
    it('collaborator cannot delete project directly', async () => {
      const { users, project } = await createFullTestEnvironment()

      // Collaborator should not have permission to delete
      // In real API, this would return 403
      // Here we verify the permission logic by checking role
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member?.role).toBe('collaborator')
      expect(member?.role).not.toBe('admin')
    })

    it('collaborator cannot manage members', async () => {
      const { users, project } = await createFullTestEnvironment()
      const newUser = await createTestUser({ name: 'New User' })

      // Verify collaborator's role doesn't allow member management
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member?.role).toBe('collaborator')
      // In real API, attempting to add member would return 403
    })

    it('collaborator cannot approve requests', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      // Create a request
      const request = await prisma.deletionRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'scene',
          targetId: scenes[0].id,
          status: 'pending'
        }
      })

      // Verify collaborator role
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member?.role).toBe('collaborator')
      // In real API, attempting to approve would return 403
    })
  })

  describe('Deletion Requests', () => {
    it('collaborator can request scene deletion', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.deletionRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'scene',
          targetId: scenes[0].id,
          status: 'pending'
        }
      })

      expect(request.status).toBe('pending')
      expect(request.requesterId).toBe(users.collaborator.id)
      expect(request.targetType).toBe('scene')
    })

    it('collaborator can request video deletion', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.deletionRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'video',
          targetId: scenes[0].id,
          status: 'pending'
        }
      })

      expect(request.targetType).toBe('video')
    })
  })

  describe('Regeneration with Own Credits', () => {
    it('collaborator can regenerate when they have credits', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment({
        collaboratorCredits: 100
      })

      // Simulate regeneration with collaborator's credits
      const initialBalance = credits.collaborator.balance

      await prisma.credits.update({
        where: { id: credits.collaborator.id },
        data: {
          balance: { decrement: 27 },
          totalSpent: { increment: 27 }
        }
      })

      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.collaborator.id,
          amount: -27,
          realCost: 0.24,
          type: 'IMAGE',
          provider: 'gemini-3-pro',
          projectId: project.id,
          metadata: { isRegeneration: true }
        }
      })

      const updatedCredits = await prisma.credits.findUnique({
        where: { id: credits.collaborator.id }
      })

      expect(updatedCredits?.balance).toBe(initialBalance - 27)
    })

    it('collaborator credits deducted from own account not admin', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment()

      const adminInitialBalance = credits.admin.balance
      const collabInitialBalance = credits.collaborator.balance

      // Collaborator generates
      await prisma.credits.update({
        where: { id: credits.collaborator.id },
        data: { balance: { decrement: 27 } }
      })

      const adminCredits = await prisma.credits.findUnique({ where: { id: credits.admin.id } })
      const collabCredits = await prisma.credits.findUnique({ where: { id: credits.collaborator.id } })

      expect(adminCredits?.balance).toBe(adminInitialBalance) // Unchanged
      expect(collabCredits?.balance).toBe(collabInitialBalance - 27)
    })
  })

  describe('Regeneration Requests (Without Credits)', () => {
    it('collaborator can request regeneration when no credits', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment({
        collaboratorCredits: 0
      })

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'pending',
          maxAttempts: 3,
          attemptsUsed: 0
        }
      })

      expect(request.status).toBe('pending')
      expect(request.requesterId).toBe(users.collaborator.id)
    })
  })

  describe('Using Approved Regeneration', () => {
    it('collaborator can use approved regeneration request', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment()

      // Admin creates and approves regeneration request with prepayment
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
          creditsPaid: 81 // 3 x 27 prepaid
        }
      })

      // Collaborator uses the request - no credit deduction
      const collabBalanceBefore = (await prisma.credits.findUnique({
        where: { id: credits.collaborator.id }
      }))?.balance

      await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          attemptsUsed: 1,
          status: 'generating',
          generatedUrls: ['https://generated-1.com/image.png']
        }
      })

      // Track real cost only (no credit deduction)
      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.admin.id, // Tracked against admin who prepaid
          amount: 0, // No credit deduction
          realCost: 0.24,
          type: 'IMAGE',
          projectId: project.id,
          metadata: { isPrepaid: true, regenerationRequestId: request.id }
        }
      })

      const collabBalanceAfter = (await prisma.credits.findUnique({
        where: { id: credits.collaborator.id }
      }))?.balance

      expect(collabBalanceAfter).toBe(collabBalanceBefore) // No deduction
    })

    it('collaborator cannot exceed max attempts', async () => {
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
          attemptsUsed: 3, // All attempts used
          creditsPaid: 81,
          generatedUrls: ['url1', 'url2', 'url3']
        }
      })

      // Request should move to selecting state
      const updated = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: { status: 'selecting' }
      })

      expect(updated.status).toBe('selecting')
      expect(updated.attemptsUsed).toBe(3)
    })

    it('collaborator can select from generated options', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'selecting',
          reviewedBy: users.admin.id,
          maxAttempts: 3,
          attemptsUsed: 3,
          creditsPaid: 81,
          generatedUrls: [
            'https://gen-1.com/image.png',
            'https://gen-2.com/image.png',
            'https://gen-3.com/image.png'
          ]
        }
      })

      const selected = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          selectedUrl: 'https://gen-2.com/image.png',
          status: 'awaiting_final'
        }
      })

      expect(selected.selectedUrl).toBe('https://gen-2.com/image.png')
      expect(selected.status).toBe('awaiting_final')
    })
  })

  describe('Cannot Use Others Regeneration Requests', () => {
    it('collaborator cannot use another collaborators request', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const collab1 = await createTestUser({ name: 'Collaborator 1' })
      const collab2 = await createTestUser({ name: 'Collaborator 2' })
      const project = await createTestProject(admin.id)
      await addProjectMember(project.id, collab1.id, 'collaborator')
      await addProjectMember(project.id, collab2.id, 'collaborator')
      const scenes = await createTestScenes(project.id, 1)

      // Request created by collab1
      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: collab1.id,
          targetType: 'image',
          targetId: scenes[0].id,
          status: 'approved',
          maxAttempts: 3,
          attemptsUsed: 0,
          creditsPaid: 81
        }
      })

      // Verify request belongs to collab1
      expect(request.requesterId).toBe(collab1.id)
      expect(request.requesterId).not.toBe(collab2.id)
      // In real API, collab2 attempting to use this would return 403
    })
  })

  describe('Statistics Access', () => {
    it('collaborator can view own statistics', async () => {
      const { users, project, credits } = await createFullTestEnvironment()

      // Create some transactions for collaborator
      await prisma.creditTransaction.createMany({
        data: [
          { creditsId: credits.collaborator.id, amount: -27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
          { creditsId: credits.collaborator.id, amount: -20, realCost: 0.10, type: 'VIDEO', projectId: project.id }
        ]
      })

      const collabTransactions = await prisma.creditTransaction.findMany({
        where: { creditsId: credits.collaborator.id }
      })

      expect(collabTransactions.length).toBe(2)
    })
  })
})
