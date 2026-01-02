// Re-export all factories for convenient imports
export * from './user'
export * from './project'
export * from './credits'
export * from './scene'
export * from './collaboration'

// Common test scenarios
import { createTestUser, createTestAdmin, createTestCollaborator, createTestReader } from './user'
import { createTestProject, addProjectMember } from './project'
import { createTestCredits } from './credits'
import { createTestScenes } from './scene'

/**
 * Creates a complete test environment with:
 * - Admin user (project owner) with credits
 * - Collaborator user with credits
 * - Reader user
 * - Project with scenes
 * - All members added to project
 */
export async function createFullTestEnvironment(options: {
  sceneCount?: number
  adminCredits?: number
  collaboratorCredits?: number
  projectPublic?: boolean
} = {}) {
  const sceneCount = options.sceneCount ?? 5
  const adminCredits = options.adminCredits ?? 1000
  const collaboratorCredits = options.collaboratorCredits ?? 500

  // Create users
  const admin = await createTestAdmin({ email: 'admin@test.com' })
  const collaborator = await createTestCollaborator({ email: 'collaborator@test.com' })
  const reader = await createTestReader({ email: 'reader@test.com' })
  const outsider = await createTestUser({ email: 'outsider@test.com', name: 'Outsider User' })

  // Create credits
  const adminCreds = await createTestCredits(admin.id, { balance: adminCredits })
  const collabCreds = await createTestCredits(collaborator.id, { balance: collaboratorCredits })
  const readerCreds = await createTestCredits(reader.id, { balance: 0 })
  const outsiderCreds = await createTestCredits(outsider.id, { balance: 100 })

  // Create project
  const project = await createTestProject(admin.id, {
    visibility: options.projectPublic ? 'public' : 'private'
  })

  // Add members
  await addProjectMember(project.id, collaborator.id, 'collaborator', admin.id)
  await addProjectMember(project.id, reader.id, 'reader', admin.id)

  // Create scenes
  const scenes = await createTestScenes(project.id, sceneCount)

  return {
    users: { admin, collaborator, reader, outsider },
    credits: {
      admin: adminCreds,
      collaborator: collabCreds,
      reader: readerCreds,
      outsider: outsiderCreds
    },
    project,
    scenes
  }
}

/**
 * Creates a minimal test setup with just a user and project
 */
export async function createMinimalTestEnvironment() {
  const user = await createTestUser()
  const credits = await createTestCredits(user.id, { balance: 500 })
  const project = await createTestProject(user.id)

  return { user, credits, project }
}
