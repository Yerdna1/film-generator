/**
 * Performance Benchmark Test Suite
 *
 * Tests database query performance and response times.
 * Run with: npm run test -- performance-benchmark
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestProject } from '@/test/factories/project'

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  database: 500,      // Database queries under 500ms
  complexQuery: 1000, // Complex queries under 1s
  batch: 1000,        // Batch operations under 1s
  transaction: 1500,  // Transactions under 1.5s
}

// Helper to measure execution time
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return { result, duration }
}

// Results collector for reporting
interface BenchmarkResult {
  name: string
  category: string
  duration: number
  status: 'pass' | 'fail' | 'error'
  threshold: number
  error?: string
}

const benchmarkResults: BenchmarkResult[] = []

function recordResult(result: BenchmarkResult) {
  benchmarkResults.push(result)
}

describe('Performance Benchmarks', () => {
  let testUser: any
  let testProject: any
  let testCredits: any

  beforeAll(async () => {
    // Create test data
    testUser = await createTestUser({
      email: `perf-test-${Date.now()}@example.com`,
      isApproved: true
    })

    testProject = await createTestProject(testUser.id, {
      name: 'Performance Test Project',
      visibility: 'private'
    })

    // Create credits for the user
    testCredits = await prisma.credits.create({
      data: {
        userId: testUser.id,
        balance: 1000,
        totalSpent: 0,
        totalEarned: 1000
      }
    })

    // Create some scenes for testing
    await prisma.scene.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        projectId: testProject.id,
        number: i + 1,
        title: `Scene ${i + 1}`,
        description: `Description for scene ${i + 1}`,
        textToImagePrompt: `Image prompt ${i + 1}`,
        imageToVideoPrompt: `Video prompt ${i + 1}`,
        duration: 5
      }))
    })
  })

  afterAll(async () => {
    // Output summary
    console.log('\n\n========== PERFORMANCE BENCHMARK RESULTS ==========\n')

    const passed = benchmarkResults.filter(r => r.status === 'pass')
    const failed = benchmarkResults.filter(r => r.status === 'fail')

    console.log(`Total: ${benchmarkResults.length} | Passed: ${passed.length} | Failed: ${failed.length}\n`)

    // Group by category
    const byCategory = benchmarkResults.reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = []
      acc[r.category].push(r)
      return acc
    }, {} as Record<string, BenchmarkResult[]>)

    for (const [category, results] of Object.entries(byCategory)) {
      console.log(`\n--- ${category.toUpperCase()} ---`)
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
      console.log(`Average: ${avgDuration.toFixed(2)}ms`)

      const sorted = [...results].sort((a, b) => b.duration - a.duration)
      sorted.forEach(r => {
        const status = r.status === 'pass' ? '✓' : '✗'
        console.log(`  ${status} ${r.name}: ${r.duration.toFixed(2)}ms (threshold: ${r.threshold}ms)`)
      })
    }

    console.log('\n====================================================\n')
  })

  describe('Basic Query Performance', () => {
    it('should query users quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.user.findMany({ take: 10 })
      })

      recordResult({
        name: 'User findMany (10)',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should query single user by ID quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.user.findUnique({
          where: { id: testUser.id }
        })
      })

      recordResult({
        name: 'User findUnique',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should query projects quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.project.findMany({ take: 10 })
      })

      recordResult({
        name: 'Project findMany (10)',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should query single project by ID quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.project.findUnique({
          where: { id: testProject.id }
        })
      })

      recordResult({
        name: 'Project findUnique',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should query credits quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.credits.findFirst({
          where: { userId: testUser.id }
        })
      })

      recordResult({
        name: 'Credits findFirst',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should query scenes with ordering quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.scene.findMany({
          where: { projectId: testProject.id },
          orderBy: { number: 'asc' }
        })
      })

      recordResult({
        name: 'Scene findMany ordered',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should query notifications quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.notification.findMany({
          where: { userId: testUser.id },
          orderBy: { createdAt: 'desc' },
          take: 20
        })
      })

      recordResult({
        name: 'Notification findMany (20)',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should count records quickly', async () => {
      const { duration } = await measureTime(async () => {
        return Promise.all([
          prisma.user.count(),
          prisma.project.count(),
          prisma.scene.count()
        ])
      })

      recordResult({
        name: 'Multiple count queries',
        category: 'Basic Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })
  })

  describe('Relational Query Performance', () => {
    it('should query projects with relations quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.project.findMany({
          take: 10,
          include: {
            user: true,
            scenes: { take: 5 },
            members: true
          }
        })
      })

      recordResult({
        name: 'Project with relations',
        category: 'Relational Queries',
        duration,
        status: duration < THRESHOLDS.complexQuery ? 'pass' : 'fail',
        threshold: THRESHOLDS.complexQuery
      })

      expect(duration).toBeLessThan(THRESHOLDS.complexQuery)
    })

    it('should query project with full relations quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.project.findUnique({
          where: { id: testProject.id },
          include: {
            user: true,
            scenes: true,
            members: { include: { user: true } },
            characters: true
          }
        })
      })

      recordResult({
        name: 'Project findUnique with full relations',
        category: 'Relational Queries',
        duration,
        status: duration < THRESHOLDS.complexQuery ? 'pass' : 'fail',
        threshold: THRESHOLDS.complexQuery
      })

      expect(duration).toBeLessThan(THRESHOLDS.complexQuery)
    })

    it('should query user with all relations quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.user.findUnique({
          where: { id: testUser.id },
          include: {
            projects: true,
            credits: true,
            notifications: { take: 10 }
          }
        })
      })

      recordResult({
        name: 'User with all relations',
        category: 'Relational Queries',
        duration,
        status: duration < THRESHOLDS.complexQuery ? 'pass' : 'fail',
        threshold: THRESHOLDS.complexQuery
      })

      expect(duration).toBeLessThan(THRESHOLDS.complexQuery)
    })

    it('should query project members with users quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.projectMember.findMany({
          where: { projectId: testProject.id },
          include: { user: true }
        })
      })

      recordResult({
        name: 'ProjectMember with users',
        category: 'Relational Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should query regeneration requests quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.regenerationRequest.findMany({
          where: { projectId: testProject.id },
          include: {
            project: true,
            requester: true
          },
          orderBy: { createdAt: 'desc' }
        })
      })

      recordResult({
        name: 'RegenerationRequest with relations',
        category: 'Relational Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })
  })

  describe('Complex Query Performance', () => {
    it('should handle user projects query with stats quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.project.findMany({
          where: {
            OR: [
              { userId: testUser.id },
              { members: { some: { userId: testUser.id } } }
            ]
          },
          include: {
            user: { select: { name: true, email: true } },
            _count: { select: { scenes: true, members: true } }
          },
          orderBy: { updatedAt: 'desc' }
        })
      })

      recordResult({
        name: 'User projects with stats',
        category: 'Complex Queries',
        duration,
        status: duration < THRESHOLDS.complexQuery ? 'pass' : 'fail',
        threshold: THRESHOLDS.complexQuery
      })

      expect(duration).toBeLessThan(THRESHOLDS.complexQuery)
    })

    it('should handle public projects discovery quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.project.findMany({
          where: { visibility: 'public' },
          include: {
            user: { select: { name: true, image: true } },
            _count: { select: { scenes: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        })
      })

      recordResult({
        name: 'Public projects discovery',
        category: 'Complex Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should handle statistics aggregation quickly', async () => {
      const { duration } = await measureTime(async () => {
        const [projectCount, sceneCount, credits] = await Promise.all([
          prisma.project.count({ where: { userId: testUser.id } }),
          prisma.scene.count({
            where: { project: { userId: testUser.id } }
          }),
          prisma.credits.findFirst({
            where: { userId: testUser.id }
          })
        ])
        return { projectCount, sceneCount, credits }
      })

      recordResult({
        name: 'User statistics aggregation',
        category: 'Complex Queries',
        duration,
        status: duration < THRESHOLDS.complexQuery ? 'pass' : 'fail',
        threshold: THRESHOLDS.complexQuery
      })

      expect(duration).toBeLessThan(THRESHOLDS.complexQuery)
    })

    it('should handle pending approvals query quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.regenerationRequest.findMany({
          where: {
            project: { userId: testUser.id },
            status: 'pending'
          },
          include: {
            project: { select: { name: true } },
            requester: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        })
      })

      recordResult({
        name: 'Pending approvals query',
        category: 'Complex Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })

    it('should aggregate credit transactions quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.creditTransaction.aggregate({
          where: { creditsId: testCredits.id },
          _sum: { amount: true, realCost: true },
          _count: true
        })
      })

      recordResult({
        name: 'CreditTransaction aggregate',
        category: 'Complex Queries',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })
  })

  describe('Batch Operations Performance', () => {
    it('should handle batch scene update quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.scene.updateMany({
          where: { projectId: testProject.id },
          data: { duration: 6 }
        })
      })

      recordResult({
        name: 'Batch scene update',
        category: 'Batch Operations',
        duration,
        status: duration < THRESHOLDS.batch ? 'pass' : 'fail',
        threshold: THRESHOLDS.batch
      })

      expect(duration).toBeLessThan(THRESHOLDS.batch)
    })

    it('should handle batch delete quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.scene.deleteMany({
          where: {
            projectId: testProject.id,
            number: { gt: 3 } // Only delete scenes 4 and 5
          }
        })
      })

      recordResult({
        name: 'Batch scene delete',
        category: 'Batch Operations',
        duration,
        status: duration < THRESHOLDS.database ? 'pass' : 'fail',
        threshold: THRESHOLDS.database
      })

      expect(duration).toBeLessThan(THRESHOLDS.database)
    })
  })

  describe('Transaction Performance', () => {
    it('should handle credit deduction transaction quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.$transaction(async (tx) => {
          const credits = await tx.credits.findFirst({
            where: { userId: testUser.id }
          })

          if (!credits) {
            return false
          }

          await tx.credits.update({
            where: { id: credits.id },
            data: { balance: { decrement: 10 } }
          })

          await tx.creditTransaction.create({
            data: {
              creditsId: credits.id,
              amount: -10,
              type: 'image_generation',
              description: 'Performance test'
            }
          })

          return true
        })
      })

      recordResult({
        name: 'Credit deduction transaction',
        category: 'Transactions',
        duration,
        status: duration < THRESHOLDS.transaction ? 'pass' : 'fail',
        threshold: THRESHOLDS.transaction
      })

      expect(duration).toBeLessThan(THRESHOLDS.transaction)
    })

    it('should handle project update with scenes transaction quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.$transaction(async (tx) => {
          const project = await tx.project.findUnique({
            where: { id: testProject.id }
          })

          if (!project) return false

          await tx.project.update({
            where: { id: testProject.id },
            data: { currentStep: 1 }
          })

          await tx.scene.updateMany({
            where: { projectId: testProject.id },
            data: { locked: false }
          })

          return true
        })
      })

      recordResult({
        name: 'Project + scenes transaction',
        category: 'Transactions',
        duration,
        status: duration < THRESHOLDS.transaction ? 'pass' : 'fail',
        threshold: THRESHOLDS.transaction
      })

      expect(duration).toBeLessThan(THRESHOLDS.transaction)
    })

    it('should handle multi-table read transaction quickly', async () => {
      const { duration } = await measureTime(async () => {
        return prisma.$transaction([
          prisma.user.findUnique({ where: { id: testUser.id } }),
          prisma.project.findUnique({ where: { id: testProject.id } }),
          prisma.credits.findFirst({ where: { userId: testUser.id } }),
          prisma.scene.findMany({ where: { projectId: testProject.id } })
        ])
      })

      recordResult({
        name: 'Multi-table read transaction',
        category: 'Transactions',
        duration,
        status: duration < THRESHOLDS.transaction ? 'pass' : 'fail',
        threshold: THRESHOLDS.transaction
      })

      expect(duration).toBeLessThan(THRESHOLDS.transaction)
    })
  })
})

// Export results for report generation
export { benchmarkResults, THRESHOLDS }
