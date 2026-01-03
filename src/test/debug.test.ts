import { describe, it, expect } from 'vitest'
import { prisma } from '@/test/setup'
import { createFullTestEnvironment, createTestUser, createTestCredits, createTestProject } from '@/test/factories'

describe('Debug Database Connection', () => {
  it('can create and read a user', async () => {
    // Create user
    const user = await prisma.user.create({
      data: {
        email: `debug-${Date.now()}@test.com`,
        name: 'Debug User',
        password: 'test123'
      }
    })
    console.log('Created user:', user.id)

    // Read back
    const found = await prisma.user.findUnique({
      where: { id: user.id }
    })
    console.log('Found user:', found?.id)

    expect(found).not.toBeNull()
    expect(found?.id).toBe(user.id)
  })

  it('can create credits for user', async () => {
    // Create user
    const user = await prisma.user.create({
      data: {
        email: `debug2-${Date.now()}@test.com`,
        name: 'Debug User 2',
        password: 'test123'
      }
    })
    console.log('Created user for credits:', user.id)

    // Create credits
    const credits = await prisma.credits.create({
      data: {
        userId: user.id,
        balance: 100,
        totalSpent: 0,
        totalEarned: 100,
        totalRealCost: 0
      }
    })
    console.log('Created credits:', credits.id, 'for user:', credits.userId)

    expect(credits.userId).toBe(user.id)
  })

  it('can use createTestUser factory', async () => {
    const user = await createTestUser()
    console.log('Factory created user:', user.id)
    expect(user.id).toBeDefined()
  })

  it('can use createTestCredits factory', async () => {
    const user = await createTestUser()
    console.log('Created user:', user.id)

    const credits = await createTestCredits(user.id)
    console.log('Factory created credits:', credits.id)
    expect(credits.userId).toBe(user.id)
  })

  it('can use createFullTestEnvironment', async () => {
    console.log('Starting createFullTestEnvironment...')
    const env = await createFullTestEnvironment()
    console.log('Created environment:', {
      admin: env.users.admin.id,
      project: env.project.id,
      sceneCount: env.scenes.length
    })
    expect(env.users.admin).toBeDefined()
    expect(env.project).toBeDefined()
  })
})
