import { beforeAll, afterAll, afterEach, vi, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'

// SECURITY: Test database URL must be provided via environment variable
// Never hardcode database credentials in source code
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL environment variable is required for tests. ' +
    'Please set it in .env.test file.'
  );
}

// Set environment variable for services that import their own prisma client
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Create test database client
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
})

// Mock external services
vi.mock('@/lib/services/s3-upload', () => ({
  uploadToS3: vi.fn().mockResolvedValue('https://mock-s3-url.com/file.png'),
  deleteFromS3: vi.fn().mockResolvedValue(true)
}))

// Mock email service
vi.mock('@/lib/services/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(true),
  sendNotificationEmail: vi.fn().mockResolvedValue(true)
}))

// Global setup
beforeAll(async () => {
  // Connect to database
  await prisma.$connect()
})

// Cleanup after each test
afterEach(async () => {
  // Clean up test data in reverse order of dependencies
  await prisma.creditTransaction.deleteMany({})
  await prisma.credits.deleteMany({})
  await prisma.regenerationRequest.deleteMany({})
  await prisma.deletionRequest.deleteMany({})
  await prisma.promptEditRequest.deleteMany({})
  await prisma.projectInvitation.deleteMany({})
  await prisma.projectMember.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.scene.deleteMany({})
  await prisma.character.deleteMany({})
  await prisma.project.deleteMany({})
  await prisma.apiKeys.deleteMany({})
  await prisma.user.deleteMany({})

  // Clear all mocks
  vi.clearAllMocks()
})

// Global teardown
afterAll(async () => {
  await prisma.$disconnect()
})

// Test utilities
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Assert helpers
export const expectToThrow = async (fn: () => Promise<any>, errorMessage?: string) => {
  try {
    await fn()
    throw new Error('Expected function to throw')
  } catch (error: any) {
    if (errorMessage) {
      expect(error.message).toContain(errorMessage)
    }
  }
}
