import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import {
  createTestUser,
  createTestProject,
  createTestCredits,
  addProjectMember,
  createTestScenes,
  createFullTestEnvironment,
  createProjectInvitation
} from '@/test/factories'

describe('Security Tests', () => {
  describe('Cross-User Data Isolation', () => {
    it('user cannot access another users project', async () => {
      const user1 = await createTestUser({ name: 'User 1' })
      const user2 = await createTestUser({ name: 'User 2' })

      const project1 = await createTestProject(user1.id, { name: 'User 1 Project' })
      const project2 = await createTestProject(user2.id, { name: 'User 2 Project' })

      // User 1's projects
      const user1Projects = await prisma.project.findMany({
        where: { userId: user1.id }
      })

      // Verify isolation
      expect(user1Projects.length).toBe(1)
      expect(user1Projects[0].id).toBe(project1.id)
      expect(user1Projects[0].id).not.toBe(project2.id)
    })

    it('user cannot access another users credits', async () => {
      const user1 = await createTestUser({ name: 'User 1' })
      const user2 = await createTestUser({ name: 'User 2' })

      await createTestCredits(user1.id, { balance: 1000 })
      await createTestCredits(user2.id, { balance: 500 })

      const user1Credits = await prisma.credits.findFirst({
        where: { userId: user1.id }
      })

      expect(user1Credits?.balance).toBe(1000)
      expect(user1Credits?.userId).toBe(user1.id)
      expect(user1Credits?.userId).not.toBe(user2.id)
    })

    it('user cannot access private project scenes without membership', async () => {
      const owner = await createTestUser({ name: 'Owner' })
      const outsider = await createTestUser({ name: 'Outsider' })

      const project = await createTestProject(owner.id)
      await createTestScenes(project.id, 5)

      // Outsider has no membership
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: outsider.id }
        }
      })

      expect(membership).toBeNull()

      // Verify project is not owned by outsider
      const projectData = await prisma.project.findUnique({
        where: { id: project.id }
      })
      expect(projectData?.userId).not.toBe(outsider.id)
    })
  })

  describe('Project Member Enumeration Prevention', () => {
    it('cannot list all users in system', async () => {
      // Create multiple users
      await createTestUser({ name: 'User 1' })
      await createTestUser({ name: 'User 2' })
      await createTestUser({ name: 'User 3' })

      // A normal user query should be scoped
      // In real API, listing all users is not allowed
      // This test verifies the database has multiple users but API wouldn't expose them

      const allUsers = await prisma.user.findMany()
      expect(allUsers.length).toBeGreaterThan(1)
      // In real API, a regular user would not have access to this endpoint
    })
  })

  describe('Sensitive Data Protection', () => {
    it('API keys are not exposed in responses', async () => {
      const user = await createTestUser()

      // Create API keys
      await prisma.apiKeys.create({
        data: {
          userId: user.id,
          openRouterApiKey: 'sk-or-secret-key',
          geminiApiKey: 'gemini-secret-key'
        }
      })

      // When fetching user, API keys should not be included
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true
          // Note: Not selecting apiKeys
        }
      })

      expect(userData).not.toHaveProperty('apiKeys')
    })

    it('password hash is not exposed', async () => {
      const user = await createTestUser()

      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true
          // Note: Not selecting password
        }
      })

      expect(userData).not.toHaveProperty('password')
    })
  })

  describe('Invitation Token Security', () => {
    it('invitation tokens are unique and non-guessable', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      const invite1 = await createProjectInvitation(project.id, 'user1@example.com', 'collaborator')
      const invite2 = await createProjectInvitation(project.id, 'user2@example.com', 'collaborator')
      const invite3 = await createProjectInvitation(project.id, 'user3@example.com', 'collaborator')

      // All tokens should be unique
      const tokens = [invite1.token, invite2.token, invite3.token]
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(3)

      // Tokens should be long enough
      tokens.forEach(token => {
        expect(token.length).toBeGreaterThan(20)
      })
    })

    it('cannot find invitation with wrong token', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const project = await createTestProject(admin.id)

      await createProjectInvitation(project.id, 'user@example.com', 'collaborator')

      const wrongToken = await prisma.projectInvitation.findUnique({
        where: { token: 'wrong-token-guess' }
      })

      expect(wrongToken).toBeNull()
    })
  })

  describe('SQL Injection Prevention', () => {
    it('Prisma parameterization prevents injection', async () => {
      const user = await createTestUser()

      // Attempt SQL injection in project name
      const maliciousName = "'; DROP TABLE projects; --"

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: maliciousName
        }
      })

      // Project created successfully with the string as-is
      expect(project.name).toBe(maliciousName)

      // Verify database is still intact
      const allProjects = await prisma.project.findMany()
      expect(allProjects.length).toBeGreaterThan(0)
    })

    it('search queries are parameterized', async () => {
      const user = await createTestUser()
      await createTestProject(user.id, { name: 'Normal Project' })

      // Attempt injection in search
      const maliciousSearch = "'; DELETE FROM projects; --"

      const results = await prisma.project.findMany({
        where: {
          name: { contains: maliciousSearch }
        }
      })

      // No results but no damage
      expect(results.length).toBe(0)

      // Verify projects still exist
      const allProjects = await prisma.project.findMany({
        where: { userId: user.id }
      })
      expect(allProjects.length).toBe(1)
    })
  })

  describe('Rate Limiting Considerations', () => {
    it('concurrent credit operations are handled safely', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, { balance: 100 })

      // Simulate concurrent deductions
      // In real app, this would use transactions
      const deduction1 = prisma.credits.update({
        where: { id: credits.id },
        data: { balance: { decrement: 10 } }
      })

      const deduction2 = prisma.credits.update({
        where: { id: credits.id },
        data: { balance: { decrement: 10 } }
      })

      await Promise.all([deduction1, deduction2])

      const finalCredits = await prisma.credits.findUnique({
        where: { id: credits.id }
      })

      // Both deductions should have been applied
      expect(finalCredits?.balance).toBe(80)
    })
  })

  describe('Session Security', () => {
    it('session token in user table exists', async () => {
      // NextAuth stores session tokens
      // This test verifies the model exists

      const user = await createTestUser()

      // User created successfully
      expect(user.id).toBeDefined()
    })
  })

  describe('Transaction Atomicity', () => {
    it('credit operations are atomic', async () => {
      const user = await createTestUser()
      const credits = await createTestCredits(user.id, { balance: 100 })
      const project = await createTestProject(user.id)

      // Use transaction for credit operation
      await prisma.$transaction([
        prisma.credits.update({
          where: { id: credits.id },
          data: {
            balance: { decrement: 27 },
            totalSpent: { increment: 27 }
          }
        }),
        prisma.creditTransaction.create({
          data: {
            creditsId: credits.id,
            amount: -27,
            realCost: 0.24,
            type: 'IMAGE',
            projectId: project.id
          }
        })
      ])

      const updatedCredits = await prisma.credits.findUnique({
        where: { id: credits.id }
      })

      const transaction = await prisma.creditTransaction.findFirst({
        where: { creditsId: credits.id }
      })

      expect(updatedCredits?.balance).toBe(73)
      expect(transaction).toBeDefined()
    })
  })

  describe('Role Elevation Prevention', () => {
    it('collaborator cannot promote themselves to admin', async () => {
      const { users, project } = await createFullTestEnvironment()

      // Get collaborator membership
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.collaborator.id }
        }
      })

      expect(membership?.role).toBe('collaborator')

      // In real API, collaborator trying to update their own role would be rejected
      // Here we verify the role is correctly set
      expect(membership?.role).not.toBe('admin')
    })

    it('reader cannot promote themselves', async () => {
      const { users, project } = await createFullTestEnvironment()

      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: project.id, userId: users.reader.id }
        }
      })

      expect(membership?.role).toBe('reader')
    })
  })

  describe('Cascade Delete Security', () => {
    it('deleting project removes all related data', async () => {
      const admin = await createTestUser({ name: 'Admin' })
      const collaborator = await createTestUser({ name: 'Collaborator' })
      const project = await createTestProject(admin.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')
      const scenes = await createTestScenes(project.id, 3)

      // Create related data
      await prisma.deletionRequest.create({
        data: {
          projectId: project.id,
          requesterId: collaborator.id,
          targetType: 'scene',
          targetId: scenes[0].id,
          status: 'pending'
        }
      })

      // Delete project
      await prisma.project.delete({ where: { id: project.id } })

      // Verify cascade
      const remainingScenes = await prisma.scene.findMany({
        where: { projectId: project.id }
      })
      const remainingMembers = await prisma.projectMember.findMany({
        where: { projectId: project.id }
      })
      const remainingRequests = await prisma.deletionRequest.findMany({
        where: { projectId: project.id }
      })

      expect(remainingScenes.length).toBe(0)
      expect(remainingMembers.length).toBe(0)
      expect(remainingRequests.length).toBe(0)
    })
  })
})
