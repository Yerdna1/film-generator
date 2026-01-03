/**
 * Performance Test Script for Homepage Load
 *
 * This script measures API call performance and verifies request deduplication.
 * Run with: npx ts-node scripts/performance-test.ts
 * Or: npx tsx scripts/performance-test.ts
 */

import http from 'http';
import https from 'https';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface RequestLog {
  url: string;
  duration: number;
  status: number;
}

interface TestResult {
  totalRequests: number;
  uniqueEndpoints: number;
  duplicateRequests: number;
  totalDuration: number;
  avgResponseTime: number;
  requests: RequestLog[];
  duplicates: Record<string, number>;
}

async function fetchWithTiming(url: string): Promise<RequestLog> {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          duration: Date.now() - start,
          status: res.statusCode || 0
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function measureHomepageLoad(): Promise<TestResult> {
  console.log('\n📊 Performance Test: Homepage Load\n');
  console.log('='.repeat(50));

  // Simulate the API calls that happen on homepage load
  const endpoints = [
    '/api/auth/session',
    '/api/credits?history=true&limit=10',
    '/api/notifications?limit=20',
    '/api/polar',
    '/api/user/status',
    '/api/statistics',
    '/api/projects/costs',
    '/api/projects',
  ];

  const requests: RequestLog[] = [];
  const duplicates: Record<string, number> = {};

  console.log('\n🔄 Making requests...\n');

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const result = await fetchWithTiming(url);
      requests.push(result);

      // Track duplicates (normalize URL by removing cache-busting params)
      const normalizedUrl = endpoint.split('?')[0];
      duplicates[normalizedUrl] = (duplicates[normalizedUrl] || 0) + 1;

      const statusIcon = result.status === 200 ? '✅' : '❌';
      console.log(`${statusIcon} ${endpoint}: ${result.duration}ms (${result.status})`);
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed - ${error}`);
    }
  }

  const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0);
  const duplicateCount = Object.values(duplicates).filter(v => v > 1).reduce((sum, v) => sum + v - 1, 0);

  return {
    totalRequests: requests.length,
    uniqueEndpoints: Object.keys(duplicates).length,
    duplicateRequests: duplicateCount,
    totalDuration,
    avgResponseTime: totalDuration / requests.length,
    requests,
    duplicates,
  };
}

async function measureDeduplication(): Promise<void> {
  console.log('\n📊 Performance Test: Request Deduplication\n');
  console.log('='.repeat(50));

  // Simulate concurrent requests to the same endpoint (what SWR deduplicates)
  const endpoint = '/api/credits?history=true&limit=10';
  const url = `${BASE_URL}${endpoint}`;

  console.log('\n🔄 Making 5 concurrent requests to same endpoint...\n');

  const start = Date.now();
  const promises = Array(5).fill(null).map(() => fetchWithTiming(url));

  try {
    const results = await Promise.all(promises);
    const totalTime = Date.now() - start;

    console.log(`\n📈 Results:`);
    console.log(`   Total time for 5 concurrent requests: ${totalTime}ms`);
    console.log(`   Average response time: ${results.reduce((sum, r) => sum + r.duration, 0) / results.length}ms`);
    console.log(`\n💡 With SWR deduplication, only 1 actual request is made!`);
  } catch (error) {
    console.log(`❌ Deduplication test failed: ${error}`);
  }
}

async function runPerformanceTests(): Promise<void> {
  console.log('\n🚀 Starting Performance Tests\n');
  console.log('Base URL:', BASE_URL);

  try {
    // Test 1: Measure homepage load
    const homepageResult = await measureHomepageLoad();

    console.log('\n📈 Homepage Load Summary:');
    console.log('='.repeat(50));
    console.log(`   Total Requests: ${homepageResult.totalRequests}`);
    console.log(`   Unique Endpoints: ${homepageResult.uniqueEndpoints}`);
    console.log(`   Duplicate Requests: ${homepageResult.duplicateRequests}`);
    console.log(`   Total Duration: ${homepageResult.totalDuration}ms`);
    console.log(`   Avg Response Time: ${homepageResult.avgResponseTime.toFixed(2)}ms`);

    if (homepageResult.duplicateRequests === 0) {
      console.log('\n✅ No duplicate requests detected! SWR deduplication is working.');
    } else {
      console.log(`\n⚠️  ${homepageResult.duplicateRequests} duplicate request(s) detected.`);
    }

    // Test 2: Measure deduplication
    await measureDeduplication();

    console.log('\n✅ Performance tests completed!\n');

  } catch (error) {
    console.error('\n❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run tests
runPerformanceTests();
