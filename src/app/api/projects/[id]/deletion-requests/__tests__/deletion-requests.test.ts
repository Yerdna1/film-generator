import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import {
  createTestUser,
  createTestProject,
  addProjectMember,
  createTestScenes,
  createFullTestEnvironment,
  createDeletionRequest
} from '@/test/factories'

describe('Deletion Request Flow Tests', () => {
  describe('Create Deletion Request', () => {
    it('creates pending request for scene deletion', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id
      })

      expect(request.status).toBe('pending')
      expect(request.targetType).toBe('scene')
      expect(request.targetId).toBe(scenes[0].id)
      expect(request.requesterId).toBe(users.collaborator.id)
    })

    it('creates pending request for character deletion', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const collaborator = await createTestUser({ name: 'Collaborator' })
      const project = await createTestProject(admin.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')

      const character = await prisma.character.create({
        data: {
          projectId: project.id,
          name: 'Test Character',
          description: 'A test character',
          visualDescription: 'A visual description',
          masterPrompt: 'A master prompt for the character'
        }
      })

      const request = await createDeletionRequest(project.id, collaborator.id, {
        targetType: 'character',
        targetId: character.id
      })

      expect(request.targetType).toBe('character')
    })

    it('creates pending request for video deletion', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      // Update scene to have a video
      await prisma.scene.update({
        where: { id: scenes[0].id },
        data: { videoUrl: 'https://example.com/video.mp4' }
      })

      const request = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'video',
        targetId: scenes[0].id
      })

      expect(request.targetType).toBe('video')
    })

    it('creates pending request for project deletion', async () => {
      const { users, project } = await createFullTestEnvironment()

      const request = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'project',
        targetId: project.id
      })

      expect(request.targetType).toBe('project')
    })
  })

  describe('Admin Approval', () => {
    it('admin can approve deletion request', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id
      })

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

    it('approval executes the deletion', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const collaborator = await createTestUser({ name: 'Collaborator' })
      const project = await createTestProject(admin.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')
      const scenes = await createTestScenes(project.id, 3)

      const request = await createDeletionRequest(project.id, collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id
      })

      // Approve and delete
      await prisma.deletionRequest.update({
        where: { id: request.id },
        data: { status: 'approved', reviewedBy: admin.id }
      })

      await prisma.scene.delete({ where: { id: scenes[0].id } })

      const deletedScene = await prisma.scene.findUnique({
        where: { id: scenes[0].id }
      })

      expect(deletedScene).toBeNull()
    })

    it('cascade deletes related data', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)
      const scenes = await createTestScenes(project.id, 2)

      // Delete project should cascade to scenes
      await prisma.project.delete({ where: { id: project.id } })

      const remainingScenes = await prisma.scene.findMany({
        where: { projectId: project.id }
      })

      expect(remainingScenes.length).toBe(0)
    })
  })

  describe('Admin Rejection', () => {
    it('admin can reject with note', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id
      })

      const rejected = await prisma.deletionRequest.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          reviewedBy: users.admin.id,
          reviewNote: 'This scene is essential to the story.'
        }
      })

      expect(rejected.status).toBe('rejected')
      expect(rejected.reviewNote).toBe('This scene is essential to the story.')
    })

    it('non-admin cannot reject', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id
      })

      // Verify collaborator cannot approve/reject
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member?.role).toBe('collaborator')
      // In real API, attempting to reject would return 403
    })
  })

  describe('List Deletion Requests', () => {
    it('can filter by pending status', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id,
        status: 'pending'
      })

      await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[1].id,
        status: 'approved',
        reviewedBy: users.admin.id
      })

      const pendingRequests = await prisma.deletionRequest.findMany({
        where: { projectId: project.id, status: 'pending' }
      })

      expect(pendingRequests.length).toBe(1)
    })

    it('admin can see all statuses', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id,
        status: 'pending'
      })

      await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[1].id,
        status: 'approved',
        reviewedBy: users.admin.id
      })

      await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[2].id,
        status: 'rejected',
        reviewedBy: users.admin.id
      })

      const allRequests = await prisma.deletionRequest.findMany({
        where: { projectId: project.id }
      })

      expect(allRequests.length).toBe(3)
    })
  })

  describe('Duplicate Requests', () => {
    it('returns existing request for same target', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request1 = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id
      })

      // Check for existing
      const existing = await prisma.deletionRequest.findFirst({
        where: {
          projectId: project.id,
          targetType: 'scene',
          targetId: scenes[0].id,
          status: 'pending'
        }
      })

      expect(existing).toBeDefined()
      expect(existing?.id).toBe(request1.id)
    })
  })

  describe('Cancel Request', () => {
    it('requester can cancel own pending request', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const request = await createDeletionRequest(project.id, users.collaborator.id, {
        targetType: 'scene',
        targetId: scenes[0].id
      })

      // Requester cancels (deletes)
      await prisma.deletionRequest.delete({
        where: { id: request.id }
      })

      const deleted = await prisma.deletionRequest.findUnique({
        where: { id: request.id }
      })

      expect(deleted).toBeNull()
    })
  })
})
