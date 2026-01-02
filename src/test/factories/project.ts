import { prisma } from '../setup'

interface CreateProjectOptions {
  name?: string
  visibility?: 'private' | 'public'
  currentStep?: number
  story?: string
}

export async function createTestProject(userId: string, options: CreateProjectOptions = {}) {
  return prisma.project.create({
    data: {
      name: options.name || `Test Project ${Date.now()}`,
      userId,
      visibility: options.visibility || 'private',
      currentStep: options.currentStep ?? 0,
      story: options.story || 'A test story for testing purposes.'
    }
  })
}

export async function createPublicProject(userId: string, options: CreateProjectOptions = {}) {
  return createTestProject(userId, {
    ...options,
    visibility: 'public'
  })
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: 'admin' | 'collaborator' | 'reader',
  invitedById?: string
) {
  return prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role,
      invitedBy: invitedById
    }
  })
}

export async function createProjectInvitation(
  projectId: string,
  email: string,
  role: 'admin' | 'collaborator' | 'reader',
  invitedBy?: string
) {
  const token = `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Get project owner if invitedBy not provided
  let inviterId = invitedBy
  if (!inviterId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    })
    inviterId = project?.userId
  }

  if (!inviterId) {
    throw new Error('Could not determine inviter for invitation')
  }

  return prisma.projectInvitation.create({
    data: {
      projectId,
      email,
      role,
      token,
      invitedBy: inviterId,
      status: 'pending',
      expiresAt
    }
  })
}
