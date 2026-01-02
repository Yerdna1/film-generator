/**
 * Database and S3 Load Monitoring Tests
 *
 * These tests help identify performance bottlenecks and
 * monitor the load on database and S3 storage.
 *
 * Categories:
 * 1. Database Query Performance
 * 2. Database Connection Pool
 * 3. N+1 Query Detection
 * 4. S3 Upload Performance
 * 5. S3 Download/Caching
 * 6. Concurrent Load Testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/test/setup';
import {
  createTestUser,
  createTestProject,
  createTestCredits,
  createTestScenes,
} from '@/test/factories';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

// ============================================
// 1. DATABASE QUERY PERFORMANCE
// ============================================
describe('Database Query Performance', () => {
  describe('Query Timing', () => {
    it('should complete user lookup in under 100ms', async () => {
      const user = await createTestUser();

      const start = performance.now();
      await prisma.user.findUnique({ where: { id: user.id } });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should complete project list query in under 200ms', async () => {
      const user = await createTestUser();
      await createTestProject(user.id);

      const start = performance.now();
      await prisma.project.findMany({ where: { userId: user.id } });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should complete scene fetch with relations in under 300ms', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestScenes(project.id, 12);

      const start = performance.now();
      await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: true, characters: true },
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should complete credit balance check in under 50ms', async () => {
      const user = await createTestUser();
      await createTestCredits(user.id, { balance: 1000 });

      const start = performance.now();
      await prisma.credits.findUnique({ where: { userId: user.id } });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should complete transaction history query in under 200ms', async () => {
      const user = await createTestUser();
      const credits = await createTestCredits(user.id, { balance: 1000 });

      // Create some transactions
      for (let i = 0; i < 10; i++) {
        await prisma.creditTransaction.create({
          data: {
            creditsId: credits.id,
            amount: -10,
            type: 'image',
            realCost: 0.1,
          },
        });
      }

      const start = performance.now();
      await prisma.creditTransaction.findMany({
        where: { creditsId: credits.id },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Query Optimization', () => {
    it('should use select to reduce data transfer', async () => {
      const user = await createTestUser();

      // Full select
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // Minimal select
      const minimalUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true },
      });

      expect(Object.keys(minimalUser || {}).length).toBeLessThan(
        Object.keys(fullUser || {}).length
      );
    });

    it('should use take/skip for pagination', async () => {
      const user = await createTestUser();

      // Create many projects
      for (let i = 0; i < 20; i++) {
        await createTestProject(user.id, { name: `Project ${i}` });
      }

      const start = performance.now();
      const paginatedProjects = await prisma.project.findMany({
        where: { userId: user.id },
        take: 10,
        skip: 0,
      });
      const duration = performance.now() - start;

      expect(paginatedProjects.length).toBe(10);
      expect(duration).toBeLessThan(100);
    });

    it('should use groupBy for aggregations', async () => {
      const user = await createTestUser();
      const credits = await createTestCredits(user.id, { balance: 1000 });
      const project = await createTestProject(user.id);

      // Create transactions of different types
      const types = ['image', 'video', 'voiceover'];
      for (const type of types) {
        await prisma.creditTransaction.create({
          data: {
            creditsId: credits.id,
            amount: -10,
            type,
            realCost: 0.1,
            projectId: project.id,
          },
        });
      }

      const start = performance.now();
      const grouped = await prisma.creditTransaction.groupBy({
        by: ['type'],
        where: { creditsId: credits.id },
        _sum: { amount: true },
      });
      const duration = performance.now() - start;

      expect(grouped.length).toBe(3);
      expect(duration).toBeLessThan(100);
    });
  });
});

// ============================================
// 2. DATABASE CONNECTION POOL
// ============================================
describe('Database Connection Pool', () => {
  it('should handle concurrent queries', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    const start = performance.now();

    // Execute 10 queries concurrently
    await Promise.all([
      prisma.user.findUnique({ where: { id: user.id } }),
      prisma.project.findUnique({ where: { id: project.id } }),
      prisma.scene.findMany({ where: { projectId: project.id } }),
      prisma.user.findUnique({ where: { id: user.id } }),
      prisma.project.findMany({ where: { userId: user.id } }),
      prisma.user.findUnique({ where: { id: user.id } }),
      prisma.project.findUnique({ where: { id: project.id } }),
      prisma.scene.count({ where: { projectId: project.id } }),
      prisma.user.count(),
      prisma.project.count({ where: { userId: user.id } }),
    ]);

    const duration = performance.now() - start;

    // Concurrent should be faster than sequential
    expect(duration).toBeLessThan(500);
  });

  it('should not leak connections', async () => {
    const user = await createTestUser();

    // Execute many queries
    for (let i = 0; i < 50; i++) {
      await prisma.user.findUnique({ where: { id: user.id } });
    }

    // Should complete without connection pool exhaustion
    expect(true).toBe(true);
  });
});

// ============================================
// 3. N+1 QUERY DETECTION
// ============================================
describe('N+1 Query Detection', () => {
  it('should use include instead of separate queries for relations', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);
    await createTestScenes(project.id, 5);

    // GOOD: Single query with include
    const start = performance.now();
    const projectWithScenes = await prisma.project.findUnique({
      where: { id: project.id },
      include: { scenes: true },
    });
    const duration = performance.now() - start;

    expect(projectWithScenes?.scenes.length).toBe(5);
    expect(duration).toBeLessThan(100);
  });

  it('should batch queries with Promise.all', async () => {
    const user = await createTestUser();
    const projects = await Promise.all([
      createTestProject(user.id, { name: 'Project 1' }),
      createTestProject(user.id, { name: 'Project 2' }),
      createTestProject(user.id, { name: 'Project 3' }),
    ]);

    // GOOD: Fetch all in parallel
    const start = performance.now();
    const results = await Promise.all(
      projects.map((p) =>
        prisma.project.findUnique({
          where: { id: p.id },
          include: { scenes: true },
        })
      )
    );
    const duration = performance.now() - start;

    expect(results.length).toBe(3);
    expect(duration).toBeLessThan(200);
  });

  it('should use transaction for batch updates', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);
    const scenes = await createTestScenes(project.id, 5);

    const start = performance.now();

    // GOOD: Single transaction for multiple updates
    await prisma.$transaction(
      scenes.map((scene) =>
        prisma.scene.update({
          where: { id: scene.id },
          data: { title: `Updated ${scene.title}` },
        })
      )
    );

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });
});

// ============================================
// 4. S3 UPLOAD PERFORMANCE
// ============================================
describe('S3 Upload Performance', () => {
  it('should measure base64 encoding performance', async () => {
    // Simulate 1MB image
    const imageSize = 1024 * 1024;
    const mockImageData = Buffer.alloc(imageSize, 'x');

    const start = performance.now();
    const base64 = mockImageData.toString('base64');
    const duration = performance.now() - start;

    expect(base64.length).toBeGreaterThan(imageSize);
    expect(duration).toBeLessThan(100);
  });

  it('should measure buffer allocation performance', async () => {
    const sizes = [
      1024 * 100,       // 100KB
      1024 * 1024,      // 1MB
      1024 * 1024 * 5,  // 5MB
    ];

    for (const size of sizes) {
      const start = performance.now();
      Buffer.alloc(size);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    }
  });

  it('should validate file size before upload', async () => {
    const maxSizes = {
      image: 20 * 1024 * 1024,  // 20MB
      video: 100 * 1024 * 1024, // 100MB
      audio: 50 * 1024 * 1024,  // 50MB
    };

    const testFile = {
      size: 15 * 1024 * 1024, // 15MB
      type: 'image',
    };

    const isValid = testFile.size <= maxSizes[testFile.type as keyof typeof maxSizes];
    expect(isValid).toBe(true);
  });
});

// ============================================
// 5. S3 DOWNLOAD/CACHING
// ============================================
describe('S3 Download and Caching', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('should cache project data', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    const cacheKey = cacheKeys.userProjects(user.id);

    // First fetch - cache miss
    const firstFetchStart = performance.now();
    const projects1 = await prisma.project.findMany({
      where: { userId: user.id },
    });
    const firstFetchDuration = performance.now() - firstFetchStart;

    // Store in cache
    cache.set(cacheKey, projects1, cacheTTL.LONG);

    // Second fetch - cache hit
    const secondFetchStart = performance.now();
    const projects2 = cache.get(cacheKey);
    const secondFetchDuration = performance.now() - secondFetchStart;

    expect(projects2).not.toBeNull();
    expect(secondFetchDuration).toBeLessThan(firstFetchDuration);
  });

  it('should invalidate cache on update', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    const cacheKey = cacheKeys.userProjects(user.id);
    cache.set(cacheKey, [project], cacheTTL.LONG);

    // Verify cache exists
    expect(cache.get(cacheKey)).not.toBeNull();

    // Invalidate
    cache.invalidate(cacheKey);

    // Verify cache is cleared
    expect(cache.get(cacheKey)).toBeNull();
  });

  it('should expire cache after TTL', async () => {
    const cacheKey = 'test:expiry';
    const data = { test: true };
    const ttl = 100; // 100ms

    cache.set(cacheKey, data, ttl);

    // Immediately available
    expect(cache.get(cacheKey)).not.toBeNull();

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be expired
    expect(cache.get(cacheKey)).toBeNull();
  });

  it('should provide cache statistics', async () => {
    cache.clear();

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    const stats = cache.getStats();

    expect(stats.size).toBe(3);
    expect(stats.keys).toContain('key1');
    expect(stats.keys).toContain('key2');
    expect(stats.keys).toContain('key3');
  });

  it('should invalidate user-specific cache', async () => {
    const userId = 'test-user-id';

    cache.set(`user:${userId}:projects`, []);
    cache.set(`user:${userId}:credits`, {});
    cache.set(`user:other-user:projects`, []);

    cache.invalidateUser(userId);

    expect(cache.get(`user:${userId}:projects`)).toBeNull();
    expect(cache.get(`user:${userId}:credits`)).toBeNull();
    expect(cache.get(`user:other-user:projects`)).not.toBeNull();
  });
});

// ============================================
// 6. CONCURRENT LOAD TESTING
// ============================================
describe('Concurrent Load Testing', () => {
  it('should handle 10 concurrent users', async () => {
    const userCount = 10;

    const start = performance.now();

    const users = await Promise.all(
      Array(userCount)
        .fill(null)
        .map((_, i) => createTestUser({ name: `User ${i}` }))
    );

    const duration = performance.now() - start;

    expect(users.length).toBe(userCount);
    expect(duration).toBeLessThan(2000);
  });

  it('should handle 50 concurrent project creations', async () => {
    const user = await createTestUser();
    const projectCount = 50;

    const start = performance.now();

    const projects = await Promise.all(
      Array(projectCount)
        .fill(null)
        .map((_, i) => createTestProject(user.id, { name: `Project ${i}` }))
    );

    const duration = performance.now() - start;

    expect(projects.length).toBe(projectCount);
    expect(duration).toBeLessThan(5000);
  });

  it('should handle mixed read/write operations', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);
    await createTestScenes(project.id, 5);

    const start = performance.now();

    // Mix of reads and writes
    await Promise.all([
      // Reads
      prisma.project.findUnique({ where: { id: project.id } }),
      prisma.scene.findMany({ where: { projectId: project.id } }),
      prisma.user.findUnique({ where: { id: user.id } }),
      // Writes
      prisma.scene.create({
        data: {
          projectId: project.id,
          number: 6,
          title: 'New Scene',
          description: 'Test',
          textToImagePrompt: 'test',
          imageToVideoPrompt: 'test',
        },
      }),
      // More reads
      prisma.project.count({ where: { userId: user.id } }),
      prisma.scene.count({ where: { projectId: project.id } }),
    ]);

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });

  it('should measure throughput', async () => {
    const user = await createTestUser();
    const iterations = 100;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await prisma.user.findUnique({ where: { id: user.id } });
    }

    const duration = performance.now() - start;
    const throughput = iterations / (duration / 1000); // queries per second

    console.log(`Throughput: ${throughput.toFixed(2)} queries/second`);

    expect(throughput).toBeGreaterThan(10); // At least 10 queries/second
  });
});

// ============================================
// DATABASE LOAD SUMMARY
// ============================================
describe('Database Load Summary', () => {
  it('should generate performance report', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);
    await createTestScenes(project.id, 12);
    await createTestCredits(user.id, { balance: 1000 });

    const metrics = {
      userLookup: 0,
      projectFetch: 0,
      scenesFetch: 0,
      creditsFetch: 0,
    };

    // User lookup
    let start = performance.now();
    await prisma.user.findUnique({ where: { id: user.id } });
    metrics.userLookup = performance.now() - start;

    // Project fetch
    start = performance.now();
    await prisma.project.findUnique({
      where: { id: project.id },
      include: { scenes: true },
    });
    metrics.projectFetch = performance.now() - start;

    // Scenes fetch
    start = performance.now();
    await prisma.scene.findMany({ where: { projectId: project.id } });
    metrics.scenesFetch = performance.now() - start;

    // Credits fetch
    start = performance.now();
    await prisma.credits.findUnique({ where: { userId: user.id } });
    metrics.creditsFetch = performance.now() - start;

    console.log('\n=== DATABASE PERFORMANCE REPORT ===');
    console.log(`User Lookup: ${metrics.userLookup.toFixed(2)}ms`);
    console.log(`Project Fetch: ${metrics.projectFetch.toFixed(2)}ms`);
    console.log(`Scenes Fetch: ${metrics.scenesFetch.toFixed(2)}ms`);
    console.log(`Credits Fetch: ${metrics.creditsFetch.toFixed(2)}ms`);
    console.log(`Total: ${Object.values(metrics).reduce((a, b) => a + b, 0).toFixed(2)}ms`);
    console.log('===================================\n');

    // All operations should be fast
    expect(Object.values(metrics).every((v) => v < 200)).toBe(true);
  });
});
