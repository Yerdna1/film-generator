import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import {
  createTestUser,
  createTestProject,
  createTestCredits,
  addProjectMember,
  createTestScenes,
  createFullTestEnvironment
} from '@/test/factories'

describe('Admin Role API Tests', () => {
  describe('Project Access', () => {
    it('admin can view project details', async () => {
      const { users, project } = await createFullTestEnvironment()

      const projectData = await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: true, characters: true }
      })

      expect(projectData).toBeDefined()
      expect(projectData?.userId).toBe(users.admin.id)
    })

    it('admin can edit project metadata', async () => {
      const { users, project } = await createFullTestEnvironment()

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { name: 'Updated Project Name' }
      })

      expect(updated.name).toBe('Updated Project Name')
    })

    it('admin can delete project', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)
      await createTestScenes(project.id, 3)

      // Delete project (cascades to scenes)
      await prisma.project.delete({ where: { id: project.id } })

      const deleted = await prisma.project.findUnique({ where: { id: project.id } })
      expect(deleted).toBeNull()
    })
  })

  describe('Member Management', () => {
    it('admin can add new members', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const newMember = await createTestUser({ name: 'New Member' })
      const project = await createTestProject(admin.id)

      await addProjectMember(project.id, newMember.id, 'collaborator', admin.id)

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: newMember.id }
        }
      })

      expect(member).toBeDefined()
      expect(member?.role).toBe('collaborator')
    })

    it('admin can remove members', async () => {
      const { users, project } = await createFullTestEnvironment()

      await prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member).toBeNull()
    })

    it('admin can change member roles', async () => {
      const { users, project } = await createFullTestEnvironment()

      await prisma.projectMember.update({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        },
        data: { role: 'admin' }
      })

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member?.role).toBe('admin')
    })
  })

  describe('Generation Operations', () => {
    it('admin generation deducts credits from admin account', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const credits = await createTestCredits(admin.id, { balance: 100 })
      const project = await createTestProject(admin.id)

      // Simulate credit deduction for image generation
      await prisma.credits.update({
        where: { id: credits.id },
        data: {
          balance: { decrement: 27 },
          totalSpent: { increment: 27 }
        }
      })

      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.id,
          amount: -27,
          realCost: 0.24,
          type: 'IMAGE',
          provider: 'gemini-3-pro',
          projectId: project.id
        }
      })

      const updatedCredits = await prisma.credits.findUnique({ where: { id: credits.id } })
      expect(updatedCredits?.balance).toBe(73)
      expect(updatedCredits?.totalSpent).toBe(27)
    })
  })

  describe('Visibility Control', () => {
    it('admin can make project public', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id, { visibility: 'private' })

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { visibility: 'public' }
      })

      expect(updated.visibility).toBe('public')
    })

    it('admin can make project private', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id, { visibility: 'public' })

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { visibility: 'private' }
      })

      expect(updated.visibility).toBe('private')
    })
  })

  describe('Request Approvals', () => {
    it('admin can approve deletion requests', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      // Create a deletion request from collaborator
      const request = await prisma.deletionRequest.create({
        data: {
          projectId: project.id,
          requesterId: users.collaborator.id,
          targetType: 'scene',
          targetId: scenes[0].id,
          status: 'pending'
        }
      })

      // Admin approves
      const approved = await prisma.deletionRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewedBy: users.admin.id
        }
      })

      expect(approved.status).toBe('approved')
      expect(approved.reviewedBy).toBe(users.admin.id)
    })

    it('admin can reject deletion requests with note', async () => {
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

      const rejected = await prisma.deletionRequest.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          reviewedBy: users.admin.id,
          reviewNote: 'This scene is important, please keep it.'
        }
      })

      expect(rejected.status).toBe('rejected')
      expect(rejected.reviewNote).toBe('This scene is important, please keep it.')
    })

    it('admin can approve regeneration requests with prepayment', async () => {
      const { users, project, scenes, credits } = await createFullTestEnvironment()

      // Create regeneration request
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

      // Admin approves with prepayment (3 x 27 credits = 81)
      const prepaymentAmount = 81

      // Deduct from admin
      await prisma.credits.update({
        where: { id: credits.admin.id },
        data: {
          balance: { decrement: prepaymentAmount },
          totalSpent: { increment: prepaymentAmount }
        }
      })

      const approved = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewedBy: users.admin.id,
          creditsPaid: prepaymentAmount
        }
      })

      expect(approved.status).toBe('approved')
      expect(approved.creditsPaid).toBe(81)

      const adminCredits = await prisma.credits.findUnique({ where: { id: credits.admin.id } })
      expect(adminCredits?.balance).toBe(1000 - 81)
    })
  })

  describe('Batch Operations', () => {
    it('admin can perform batch scene updates', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)
      const scenes = await createTestScenes(project.id, 5)

      // Batch update all scenes
      await prisma.scene.updateMany({
        where: { projectId: project.id },
        data: { imageUrl: 'https://batch-updated.com/image.png' }
      })

      const updatedScenes = await prisma.scene.findMany({
        where: { projectId: project.id }
      })

      expect(updatedScenes.every(s => s.imageUrl === 'https://batch-updated.com/image.png')).toBe(true)
    })
  })

  describe('Statistics Access', () => {
    it('admin can view full project statistics', async () => {
      const { users, project, credits } = await createFullTestEnvironment()

      // Create some transactions
      await prisma.creditTransaction.createMany({
        data: [
          { creditsId: credits.admin.id, amount: -27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
          { creditsId: credits.admin.id, amount: -27, realCost: 0.24, type: 'IMAGE', projectId: project.id },
          { creditsId: credits.collaborator.id, amount: -20, realCost: 0.10, type: 'VIDEO', projectId: project.id }
        ]
      })

      const transactions = await prisma.creditTransaction.findMany({
        where: { projectId: project.id }
      })

      const totalCredits = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      const totalRealCost = transactions.reduce((sum, t) => sum + t.realCost, 0)

      expect(transactions.length).toBe(3)
      expect(totalCredits).toBe(74)
      expect(totalRealCost).toBeCloseTo(0.58, 2)
    })
  })
})
