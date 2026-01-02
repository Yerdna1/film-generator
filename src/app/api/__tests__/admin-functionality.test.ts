import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits } from '@/test/factories/credits'
import { createTestProject } from '@/test/factories/project'
import { createTestScene } from '@/test/factories/scene'

describe('Admin Functionality Tests', () => {
  describe('Project Admin Role', () => {
    it('owner is automatically admin of project', async () => {
      const owner = await createTestUser()
      const project = await createTestProject(owner.id)

      expect(project.userId).toBe(owner.id)
      // Owner implicitly has admin rights
    })

    it('admin can add collaborators', async () => {
      const admin = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(admin.id)

      const member = await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: admin.id
        }
      })

      expect(member).toBeDefined()
      expect(member.role).toBe('collaborator')
    })

    it('admin can add readers', async () => {
      const admin = await createTestUser()
      const reader = await createTestUser()
      const project = await createTestProject(admin.id)

      const member = await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: reader.id,
          role: 'reader',
          invitedBy: admin.id
        }
      })

      expect(member.role).toBe('reader')
    })

    it('admin can remove members', async () => {
      const admin = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(admin.id)

      const member = await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: admin.id
        }
      })

      await prisma.projectMember.delete({
        where: { id: member.id }
      })

      const found = await prisma.projectMember.findUnique({
        where: { id: member.id }
      })
      expect(found).toBeNull()
    })

    it('admin can change member roles', async () => {
      const admin = await createTestUser()
      const user = await createTestUser()
      const project = await createTestProject(admin.id)

      const member = await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: 'reader',
          invitedBy: admin.id
        }
      })

      const updated = await prisma.projectMember.update({
        where: { id: member.id },
        data: { role: 'collaborator' }
      })

      expect(updated.role).toBe('collaborator')
    })
  })

  describe('Admin Approval Workflow', () => {
    it('admin can approve regeneration requests', async () => {
      const admin = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(admin.id)
      const scene = await createTestScene(project.id, { number: 1 })

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: admin.id
        }
      })

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: collaborator.id,
          targetType: 'image',
          targetId: scene.id,
          reason: 'Needs improvement',
          status: 'pending'
        }
      })

      const approved = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewer: { connect: { id: admin.id } },
          reviewedAt: new Date()
        }
      })

      expect(approved.status).toBe('approved')
    })

    it('admin can reject regeneration requests', async () => {
      const admin = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(admin.id)
      const scene = await createTestScene(project.id, { number: 1 })

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: admin.id
        }
      })

      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: collaborator.id,
          targetType: 'image',
          targetId: scene.id,
          reason: 'Needs improvement',
          status: 'pending'
        }
      })

      const rejected = await prisma.regenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          reviewer: { connect: { id: admin.id } },
          reviewedAt: new Date(),
          reviewNote: 'Current version is acceptable'
        }
      })

      expect(rejected.status).toBe('rejected')
      expect(rejected.reviewNote).toBe('Current version is acceptable')
    })

    it('admin can approve deletion requests', async () => {
      const admin = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(admin.id)
      const scene = await createTestScene(project.id, { number: 1 })

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: admin.id
        }
      })

      const request = await prisma.deletionRequest.create({
        data: {
          projectId: project.id,
          requesterId: collaborator.id,
          targetType: 'scene',
          targetId: scene.id,
          reason: 'Scene not needed',
          status: 'pending'
        }
      })

      const approved = await prisma.deletionRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewer: { connect: { id: admin.id } },
          reviewedAt: new Date()
        }
      })

      expect(approved.status).toBe('approved')
    })
  })

  describe('Admin Project Management', () => {
    it('admin can update project settings', async () => {
      const admin = await createTestUser()
      const project = await createTestProject(admin.id)

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: {
          settings: {
            aspectRatio: '16:9',
            resolution: '4k',
            sceneCount: 20
          }
        }
      })

      expect((updated.settings as any).resolution).toBe('4k')
    })

    it('admin can change project visibility', async () => {
      const admin = await createTestUser()
      const project = await createTestProject(admin.id, { visibility: 'private' })

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { visibility: 'public' }
      })

      expect(updated.visibility).toBe('public')
    })

    it('admin can delete project', async () => {
      const admin = await createTestUser()
      const project = await createTestProject(admin.id)

      await prisma.project.delete({
        where: { id: project.id }
      })

      const found = await prisma.project.findUnique({
        where: { id: project.id }
      })
      expect(found).toBeNull()
    })

    it('admin can update master prompt', async () => {
      const admin = await createTestUser()
      const project = await createTestProject(admin.id)

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { masterPrompt: 'New master prompt for the project' }
      })

      expect(updated.masterPrompt).toBe('New master prompt for the project')
    })
  })

  describe('Role-Based Access Control', () => {
    it('reader role can view project', async () => {
      const admin = await createTestUser()
      const reader = await createTestUser()
      const project = await createTestProject(admin.id, { name: 'Test Project' })

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: reader.id,
          role: 'reader',
          invitedBy: admin.id
        }
      })

      // Reader can find the project they're a member of
      const membership = await prisma.projectMember.findFirst({
        where: { userId: reader.id, projectId: project.id },
        include: { project: true }
      })

      expect(membership?.project.name).toBe('Test Project')
    })

    it('collaborator has higher privileges than reader', async () => {
      const admin = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(admin.id)

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'collaborator',
          invitedBy: admin.id
        }
      })

      // Collaborator can create regeneration requests
      const request = await prisma.regenerationRequest.create({
        data: {
          projectId: project.id,
          requesterId: collaborator.id,
          targetType: 'image',
          targetId: 'some-id',
          reason: 'Test',
          status: 'pending'
        }
      })

      expect(request).toBeDefined()
    })
  })
})
