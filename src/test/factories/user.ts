import { prisma } from '../setup'
import { hash } from 'bcryptjs'

interface CreateUserOptions {
  email?: string
  name?: string
  password?: string
  image?: string
}

export async function createTestUser(options: CreateUserOptions = {}) {
  const email = options.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  const hashedPassword = await hash(options.password || 'TestPassword123!', 10)

  return prisma.user.create({
    data: {
      email,
      name: options.name || 'Test User',
      password: hashedPassword,
      image: options.image || null,
      emailVerified: new Date()
    }
  })
}

export async function createTestAdmin(options: CreateUserOptions = {}) {
  return createTestUser({
    ...options,
    name: options.name || 'Admin User'
  })
}

export async function createTestCollaborator(options: CreateUserOptions = {}) {
  return createTestUser({
    ...options,
    name: options.name || 'Collaborator User'
  })
}

export async function createTestReader(options: CreateUserOptions = {}) {
  return createTestUser({
    ...options,
    name: options.name || 'Reader User'
  })
}
