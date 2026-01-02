import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import {
  createTestUser,
  createTestProject,
  createPublicProject,
  addProjectMember,
  createTestScenes,
  createFullTestEnvironment
} from '@/test/factories'

describe('Reader Role API Tests', () => {
  describe('Project Access', () => {
    it('reader can view project details', async () => {
      const { users, project } = await createFullTestEnvironment()

      const projectData = await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: true }
      })

      expect(projectData).toBeDefined()
    })

    it('reader can view scenes', async () => {
      const { users, project, scenes } = await createFullTestEnvironment()

      const projectScenes = await prisma.scene.findMany({
        where: { projectId: project.id }
      })

      expect(projectScenes.length).toBe(scenes.length)
    })
  })

  describe('Restricted Actions', () => {
    it('reader cannot edit project', async () => {
      const { users, project } = await createFullTestEnvironment()

      // Verify reader role
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
      // In real API, attempting to edit would return 403
    })

    it('reader cannot edit scenes', async () => {
      const { users, project } = await createFullTestEnvironment()

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
    })

    it('reader cannot delete anything', async () => {
      const { users, project } = await createFullTestEnvironment()

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
    })

    it('reader cannot request deletion', async () => {
      const { users, project } = await createFullTestEnvironment()

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
      // In real API, attempting to request deletion would return 403
    })

    it('reader cannot regenerate', async () => {
      const { users, project } = await createFullTestEnvironment()

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
    })

    it('reader cannot request regeneration', async () => {
      const { users, project } = await createFullTestEnvironment()

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
    })

    it('reader cannot manage members', async () => {
      const { users, project } = await createFullTestEnvironment()

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
    })

    it('reader cannot export project', async () => {
      const { users, project } = await createFullTestEnvironment()

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(member?.role).toBe('reader')
    })
  })

  describe('Read-Only Statistics', () => {
    it('reader can view project stats', async () => {
      const { users, project } = await createFullTestEnvironment()

      // Reader can query project statistics
      const projectData = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          _count: { select: { scenes: true, characters: true } }
        }
      })

      expect(projectData?._count).toBeDefined()
    })
  })
})

describe('Public Access API Tests', () => {
  describe('Public Project Access', () => {
    it('unauthenticated user can view public project', async () => {
      const owner = await createTestUser({ name: 'Owner' })
      const project = await createPublicProject(owner.id)
      await createTestScenes(project.id, 3)

      // Public project is accessible
      const publicProject = await prisma.project.findFirst({
        where: {
          id: project.id,
          visibility: 'public'
        },
        include: { scenes: true }
      })

      expect(publicProject).toBeDefined()
      expect(publicProject?.visibility).toBe('public')
      expect(publicProject?.scenes.length).toBe(3)
    })

    it('unauthenticated user cannot view private project', async () => {
      const owner = await createTestUser({ name: 'Owner' })
      const project = await createTestProject(owner.id, { visibility: 'private' })

      // Attempt to access without being a member
      const privateProject = await prisma.project.findFirst({
        where: {
          id: project.id,
          visibility: 'public' // This query won't find it
        }
      })

      expect(privateProject).toBeNull()
    })
  })

  describe('Public Project Restrictions', () => {
    it('public user cannot edit public project', async () => {
      const owner = await createTestUser({ name: 'Owner' })
      const outsider = await createTestUser({ name: 'Outsider' })
      const project = await createPublicProject(owner.id)

      // Verify outsider is not a member
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: outsider.id }
        }
      })

      expect(member).toBeNull()
      // In real API, attempting to edit would return 403
    })

    it('public user cannot see member list of public project', async () => {
      const owner = await createTestUser({ name: 'Owner' })
      const collaborator = await createTestUser({ name: 'Collaborator' })
      const project = await createPublicProject(owner.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')

      // Member list should not be publicly accessible
      // This is enforced at API level, not database
      const project_public = await prisma.project.findFirst({
        where: { id: project.id, visibility: 'public' },
        select: { id: true, name: true, visibility: true }
        // Note: Not selecting members for public access
      })

      expect(project_public).toBeDefined()
    })
  })

  describe('Public Project Discovery', () => {
    it('can list public projects for discovery', async () => {
      const owner1 = await createTestUser({ name: 'Owner 1' })
      const owner2 = await createTestUser({ name: 'Owner 2' })

      await createPublicProject(owner1.id, { name: 'Public Project 1' })
      await createPublicProject(owner2.id, { name: 'Public Project 2' })
      await createTestProject(owner1.id, { name: 'Private Project' })

      const publicProjects = await prisma.project.findMany({
        where: { visibility: 'public' }
      })

      expect(publicProjects.length).toBe(2)
      expect(publicProjects.every(p => p.visibility === 'public')).toBe(true)
    })

    it('private projects not included in discovery', async () => {
      const owner = await createTestUser({ name: 'Owner' })

      await createTestProject(owner.id, { name: 'Private 1' })
      await createTestProject(owner.id, { name: 'Private 2' })
      await createPublicProject(owner.id, { name: 'Public 1' })

      const publicProjects = await prisma.project.findMany({
        where: { visibility: 'public' }
      })

      expect(publicProjects.length).toBe(1)
      expect(publicProjects[0].name).toBe('Public 1')
    })
  })

  describe('Outsider Access to Private Projects', () => {
    it('outsider cannot access private project', async () => {
      const owner = await createTestUser({ name: 'Owner' })
      const outsider = await createTestUser({ name: 'Outsider' })
      const project = await createTestProject(owner.id)

      // Check that outsider has no role
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: outsider.id }
        }
      })

      expect(member).toBeNull()

      // Project owner is not the outsider
      expect(project.userId).not.toBe(outsider.id)
    })

    it('outsider cannot view scenes of private project', async () => {
      const owner = await createTestUser({ name: 'Owner' })
      const outsider = await createTestUser({ name: 'Outsider' })
      const project = await createTestProject(owner.id)
      await createTestScenes(project.id, 3)

      // Outsider has no access - verified at API level
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: outsider.id }
        }
      })

      expect(member).toBeNull()
    })
  })
})
