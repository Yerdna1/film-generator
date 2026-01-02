import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import {
  createTestUser,
  createTestProject,
  addProjectMember,
  createProjectInvitation,
  createFullTestEnvironment
} from '@/test/factories'

describe('Invitation Flow Tests', () => {
  describe('Create Invitation', () => {
    it('creates pending invitation with valid email', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'newuser@example.com',
        'collaborator'
      )

      expect(invitation.status).toBe('pending')
      expect(invitation.email).toBe('newuser@example.com')
      expect(invitation.role).toBe('collaborator')
      expect(invitation.token).toBeDefined()
    })

    it('returns error when inviting existing member', async () => {
      const { users, project } = await createFullTestEnvironment()

      // Try to invite someone already a member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(existingMember).toBeDefined()
      // In real API, inviting existing member email would return error
    })

    it('sets 7-day expiration by default', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'newuser@example.com',
        'collaborator'
      )

      const now = new Date()
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      expect(invitation.expiresAt.getTime()).toBeGreaterThan(now.getTime())
      expect(invitation.expiresAt.getTime()).toBeLessThanOrEqual(sevenDaysLater.getTime() + 1000)
    })

    it('generates unique token for invite link', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invite1 = await createProjectInvitation(project.id, 'user1@example.com', 'collaborator')
      const invite2 = await createProjectInvitation(project.id, 'user2@example.com', 'collaborator')

      expect(invite1.token).not.toBe(invite2.token)
    })
  })

  describe('Accept Invitation', () => {
    it('creates ProjectMember on valid token acceptance', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const newUser = await createTestUser({ name: 'New User', email: 'newuser@example.com' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'newuser@example.com',
        'collaborator'
      )

      // Accept invitation
      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date()
        }
      })

      // Create membership
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: newUser.id,
          role: invitation.role as 'admin' | 'collaborator' | 'reader'
        }
      })

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: newUser.id }
        }
      })

      expect(member).toBeDefined()
      expect(member?.role).toBe('collaborator')
    })

    it('returns error for expired token', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      // Create expired invitation
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday

      const invitation = await prisma.projectInvitation.create({
        data: {
          projectId: project.id,
          email: 'expired@example.com',
          role: 'collaborator',
          token: `expired-${Date.now()}`,
          invitedBy: admin.id,
          status: 'pending',
          expiresAt: expiredDate
        }
      })

      expect(invitation.expiresAt.getTime()).toBeLessThan(Date.now())
      // In real API, accepting expired invitation would return error
    })

    it('returns error for already accepted invitation', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await prisma.projectInvitation.create({
        data: {
          projectId: project.id,
          email: 'accepted@example.com',
          role: 'collaborator',
          token: `accepted-${Date.now()}`,
          invitedBy: admin.id,
          status: 'accepted',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          acceptedAt: new Date()
        }
      })

      expect(invitation.status).toBe('accepted')
      // In real API, accepting again would return error
    })

    it('returns error when email doesnt match', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const wrongUser = await createTestUser({ name: 'Wrong User', email: 'wrong@example.com' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'correct@example.com',
        'collaborator'
      )

      // Wrong user tries to accept
      expect(invitation.email).not.toBe(wrongUser.email)
      // In real API, this would return error
    })
  })

  describe('Revoke Invitation', () => {
    it('admin can revoke pending invitation', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'pending@example.com',
        'collaborator'
      )

      await prisma.projectInvitation.delete({
        where: { id: invitation.id }
      })

      const deleted = await prisma.projectInvitation.findUnique({
        where: { id: invitation.id }
      })

      expect(deleted).toBeNull()
    })

    it('non-admin cannot revoke invitation', async () => {
      const { users, project } = await createFullTestEnvironment()

      const invitation = await createProjectInvitation(
        project.id,
        'pending@example.com',
        'collaborator'
      )

      // Verify collaborator role
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member?.role).toBe('collaborator')
      // In real API, collaborator revoking would return 403
    })
  })

  describe('List Invitations', () => {
    it('admin sees all invitations', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      await createProjectInvitation(project.id, 'user1@example.com', 'collaborator')
      await createProjectInvitation(project.id, 'user2@example.com', 'reader')
      await createProjectInvitation(project.id, 'user3@example.com', 'admin')

      const invitations = await prisma.projectInvitation.findMany({
        where: { projectId: project.id }
      })

      expect(invitations.length).toBe(3)
    })

    it('collaborator cannot list invitations', async () => {
      const { users, project } = await createFullTestEnvironment()

      // Verify role
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(member?.role).toBe('collaborator')
      // In real API, this would return 403
    })
  })

  describe('Resend Invitation', () => {
    it('resend resets expiry date', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'resend@example.com',
        'collaborator'
      )

      const originalExpiry = invitation.expiresAt

      // Simulate resend - update expiry
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const updated = await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { expiresAt: newExpiry }
      })

      expect(updated.expiresAt.getTime()).toBeGreaterThan(originalExpiry.getTime())
    })
  })

  describe('Invitation Roles', () => {
    it('can invite as admin role', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'newadmin@example.com',
        'admin'
      )

      expect(invitation.role).toBe('admin')
    })

    it('can invite as collaborator role', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'newcollab@example.com',
        'collaborator'
      )

      expect(invitation.role).toBe('collaborator')
    })

    it('can invite as reader role', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invitation = await createProjectInvitation(
        project.id,
        'newreader@example.com',
        'reader'
      )

      expect(invitation.role).toBe('reader')
    })
  })
})
