import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestProject, addProjectMember } from '@/test/factories/project'
import {
  getUserProjectRole,
  checkPermission,
  verifyPermission,
  getProjectAdmins,
  ROLE_PERMISSIONS,
  type ProjectPermissions
} from '../permissions'

describe('Permissions System', () => {
  describe('getUserProjectRole', () => {
    it('returns admin for project owner', async () => {
      const owner = await createTestUser()
      const project = await createTestProject(owner.id)

      const role = await getUserProjectRole(owner.id, project.id)

      expect(role).toBe('admin')
    })

    it('returns admin for member with admin role', async () => {
      const owner = await createTestUser()
      const adminMember = await createTestUser({ name: 'Admin Member' })
      const project = await createTestProject(owner.id)
      await addProjectMember(project.id, adminMember.id, 'admin')

      const role = await getUserProjectRole(adminMember.id, project.id)

      expect(role).toBe('admin')
    })

    it('returns collaborator for member with collaborator role', async () => {
      const owner = await createTestUser()
      const collaborator = await createTestUser({ name: 'Collaborator' })
      const project = await createTestProject(owner.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')

      const role = await getUserProjectRole(collaborator.id, project.id)

      expect(role).toBe('collaborator')
    })

    it('returns reader for member with reader role', async () => {
      const owner = await createTestUser()
      const reader = await createTestUser({ name: 'Reader' })
      const project = await createTestProject(owner.id)
      await addProjectMember(project.id, reader.id, 'reader')

      const role = await getUserProjectRole(reader.id, project.id)

      expect(role).toBe('reader')
    })

    it('returns reader for any user on public project', async () => {
      const owner = await createTestUser()
      const outsider = await createTestUser({ name: 'Outsider' })
      const project = await createTestProject(owner.id, { visibility: 'public' })

      const role = await getUserProjectRole(outsider.id, project.id)

      expect(role).toBe('reader')
    })

    it('returns null for user without access to private project', async () => {
      const owner = await createTestUser()
      const outsider = await createTestUser({ name: 'Outsider' })
      const project = await createTestProject(owner.id) // private by default

      const role = await getUserProjectRole(outsider.id, project.id)

      expect(role).toBeNull()
    })
  })

  describe('checkPermission', () => {
    describe('Admin permissions', () => {
      let owner: any
      let project: any

      beforeEach(async () => {
        owner = await createTestUser()
        project = await createTestProject(owner.id)
      })

      it('admin canView returns true', async () => {
        const result = await checkPermission(owner.id, project.id, 'canView')
        expect(result).toBe(true)
      })

      it('admin canEdit returns true', async () => {
        const result = await checkPermission(owner.id, project.id, 'canEdit')
        expect(result).toBe(true)
      })

      it('admin canRegenerate returns true', async () => {
        const result = await checkPermission(owner.id, project.id, 'canRegenerate')
        expect(result).toBe(true)
      })

      it('admin canDelete returns true', async () => {
        const result = await checkPermission(owner.id, project.id, 'canDelete')
        expect(result).toBe(true)
      })

      it('admin canRequestDeletion returns false (admins delete directly)', async () => {
        const result = await checkPermission(owner.id, project.id, 'canRequestDeletion')
        expect(result).toBe(false)
      })

      it('admin canRequestRegeneration returns false (admins regenerate directly)', async () => {
        const result = await checkPermission(owner.id, project.id, 'canRequestRegeneration')
        expect(result).toBe(false)
      })

      it('admin canManageMembers returns true', async () => {
        const result = await checkPermission(owner.id, project.id, 'canManageMembers')
        expect(result).toBe(true)
      })

      it('admin canApproveRequests returns true', async () => {
        const result = await checkPermission(owner.id, project.id, 'canApproveRequests')
        expect(result).toBe(true)
      })
    })

    describe('Collaborator permissions', () => {
      let owner: any
      let collaborator: any
      let project: any

      beforeEach(async () => {
        owner = await createTestUser()
        collaborator = await createTestUser({ name: 'Collaborator' })
        project = await createTestProject(owner.id)
        await addProjectMember(project.id, collaborator.id, 'collaborator')
      })

      it('collaborator canView returns true', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canView')
        expect(result).toBe(true)
      })

      it('collaborator canEdit returns true', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canEdit')
        expect(result).toBe(true)
      })

      it('collaborator canRegenerate returns true (with credits)', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canRegenerate')
        expect(result).toBe(true)
      })

      it('collaborator canDelete returns false', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canDelete')
        expect(result).toBe(false)
      })

      it('collaborator canRequestDeletion returns true', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canRequestDeletion')
        expect(result).toBe(true)
      })

      it('collaborator canRequestRegeneration returns true (without credits)', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canRequestRegeneration')
        expect(result).toBe(true)
      })

      it('collaborator canManageMembers returns false', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canManageMembers')
        expect(result).toBe(false)
      })

      it('collaborator canApproveRequests returns false', async () => {
        const result = await checkPermission(collaborator.id, project.id, 'canApproveRequests')
        expect(result).toBe(false)
      })
    })

    describe('Reader permissions', () => {
      let owner: any
      let reader: any
      let project: any

      beforeEach(async () => {
        owner = await createTestUser()
        reader = await createTestUser({ name: 'Reader' })
        project = await createTestProject(owner.id)
        await addProjectMember(project.id, reader.id, 'reader')
      })

      it('reader canView returns true', async () => {
        const result = await checkPermission(reader.id, project.id, 'canView')
        expect(result).toBe(true)
      })

      it('reader canEdit returns false', async () => {
        const result = await checkPermission(reader.id, project.id, 'canEdit')
        expect(result).toBe(false)
      })

      it('reader canRegenerate returns false', async () => {
        const result = await checkPermission(reader.id, project.id, 'canRegenerate')
        expect(result).toBe(false)
      })

      it('reader canDelete returns false', async () => {
        const result = await checkPermission(reader.id, project.id, 'canDelete')
        expect(result).toBe(false)
      })

      it('reader canRequestDeletion returns false', async () => {
        const result = await checkPermission(reader.id, project.id, 'canRequestDeletion')
        expect(result).toBe(false)
      })

      it('reader canRequestRegeneration returns false', async () => {
        const result = await checkPermission(reader.id, project.id, 'canRequestRegeneration')
        expect(result).toBe(false)
      })

      it('reader canManageMembers returns false', async () => {
        const result = await checkPermission(reader.id, project.id, 'canManageMembers')
        expect(result).toBe(false)
      })

      it('reader canApproveRequests returns false', async () => {
        const result = await checkPermission(reader.id, project.id, 'canApproveRequests')
        expect(result).toBe(false)
      })
    })

    describe('Public access permissions', () => {
      it('allows viewing public project without membership', async () => {
        const owner = await createTestUser()
        const outsider = await createTestUser({ name: 'Outsider' })
        const project = await createTestProject(owner.id, { visibility: 'public' })

        const canView = await checkPermission(outsider.id, project.id, 'canView')
        const canEdit = await checkPermission(outsider.id, project.id, 'canEdit')

        expect(canView).toBe(true)
        expect(canEdit).toBe(false)
      })

      it('denies all access to private project without membership', async () => {
        const owner = await createTestUser()
        const outsider = await createTestUser({ name: 'Outsider' })
        const project = await createTestProject(owner.id)

        const canView = await checkPermission(outsider.id, project.id, 'canView')
        const canEdit = await checkPermission(outsider.id, project.id, 'canEdit')

        expect(canView).toBe(false)
        expect(canEdit).toBe(false)
      })
    })
  })

  describe('verifyPermission', () => {
    it('returns allowed=true when permission granted', async () => {
      const owner = await createTestUser()
      const project = await createTestProject(owner.id)

      const result = await verifyPermission(owner.id, project.id, 'canEdit')

      expect(result.allowed).toBe(true)
    })

    it('returns allowed=false with error when permission denied', async () => {
      const owner = await createTestUser()
      const reader = await createTestUser({ name: 'Reader' })
      const project = await createTestProject(owner.id)
      await addProjectMember(project.id, reader.id, 'reader')

      const result = await verifyPermission(reader.id, project.id, 'canEdit')

      expect(result.allowed).toBe(false)
      if (!result.allowed) {
        expect(result.error).toContain('permission')
      }
    })

    it('returns allowed=false for non-member', async () => {
      const owner = await createTestUser()
      const outsider = await createTestUser({ name: 'Outsider' })
      const project = await createTestProject(owner.id)

      const result = await verifyPermission(outsider.id, project.id, 'canView')

      expect(result.allowed).toBe(false)
      if (!result.allowed) {
        expect(result.error).toContain('access')
      }
    })
  })

  describe('getProjectAdmins', () => {
    it('includes project owner in admin list', async () => {
      const owner = await createTestUser()
      const project = await createTestProject(owner.id)

      const adminIds = await getProjectAdmins(project.id)

      expect(adminIds).toContain(owner.id)
    })

    it('includes members with admin role', async () => {
      const owner = await createTestUser()
      const adminMember = await createTestUser({ name: 'Admin Member' })
      const project = await createTestProject(owner.id)
      await addProjectMember(project.id, adminMember.id, 'admin')

      const adminIds = await getProjectAdmins(project.id)

      expect(adminIds.length).toBe(2)
      expect(adminIds).toContain(owner.id)
      expect(adminIds).toContain(adminMember.id)
    })

    it('excludes collaborators and readers', async () => {
      const owner = await createTestUser()
      const collaborator = await createTestUser({ name: 'Collaborator' })
      const reader = await createTestUser({ name: 'Reader' })
      const project = await createTestProject(owner.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')
      await addProjectMember(project.id, reader.id, 'reader')

      const adminIds = await getProjectAdmins(project.id)

      expect(adminIds.length).toBe(1)
      expect(adminIds[0]).toBe(owner.id)
    })
  })

  describe('ROLE_PERMISSIONS constants', () => {
    it('has all required permission flags for admin', () => {
      expect(ROLE_PERMISSIONS.admin.canView).toBe(true)
      expect(ROLE_PERMISSIONS.admin.canEdit).toBe(true)
      expect(ROLE_PERMISSIONS.admin.canRegenerate).toBe(true)
      expect(ROLE_PERMISSIONS.admin.canDelete).toBe(true)
      expect(ROLE_PERMISSIONS.admin.canManageMembers).toBe(true)
      expect(ROLE_PERMISSIONS.admin.canApproveRequests).toBe(true)
    })

    it('has all required permission flags for collaborator', () => {
      expect(ROLE_PERMISSIONS.collaborator.canView).toBe(true)
      expect(ROLE_PERMISSIONS.collaborator.canEdit).toBe(true)
      expect(ROLE_PERMISSIONS.collaborator.canRegenerate).toBe(true)
      expect(ROLE_PERMISSIONS.collaborator.canDelete).toBe(false)
      expect(ROLE_PERMISSIONS.collaborator.canRequestDeletion).toBe(true)
    })

    it('has all required permission flags for reader', () => {
      expect(ROLE_PERMISSIONS.reader.canView).toBe(true)
      expect(ROLE_PERMISSIONS.reader.canEdit).toBe(false)
      expect(ROLE_PERMISSIONS.reader.canRegenerate).toBe(false)
      expect(ROLE_PERMISSIONS.reader.canDelete).toBe(false)
    })
  })
})
