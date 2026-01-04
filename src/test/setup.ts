import { beforeAll, afterAll, afterEach, vi, expect, beforeEach } from 'vitest'

// Test database URL - must match the URL in vitest.config.mts
const TEST_DB_URL = 'postgresql://neondb_owner:npg_9XMixI8ElAJa@ep-rough-butterfly-agblumty.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'

// Use vi.hoisted to create a SINGLE shared client that's available to vi.mock
// vi.hoisted runs before vi.mock, ensuring the client exists when the mock factory runs
const { testPrisma } = vi.hoisted(() => {
  const { PrismaClient } = require('@prisma/client')
  const client = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://neondb_owner:npg_9XMixI8ElAJa@ep-rough-butterfly-agblumty.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
      }
    }
  })
  return { testPrisma: client }
})

// Export the shared client for factories
export const prisma = testPrisma

// Mock the @/lib/db/prisma module to use the SAME shared client
vi.mock('@/lib/db/prisma', () => ({
  prisma: testPrisma,
  default: testPrisma
}))

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

// Database cleanup function - used before and after tests
async function cleanupDatabase() {
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
}

// Global setup
beforeAll(async () => {
  // Connect to database
  await prisma.$connect()
  // Initial cleanup to ensure clean state
  await cleanupDatabase()
})

// Cleanup BEFORE each test to ensure clean slate
beforeEach(async () => {
  // Ensure database is clean before test starts
  await cleanupDatabase()
  // Clear all mocks
  vi.clearAllMocks()
})

// Also cleanup after each test for good measure
afterEach(async () => {
  await cleanupDatabase()
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
