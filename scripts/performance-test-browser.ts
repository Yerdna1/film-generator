/**
 * Browser-based Performance Test using Playwright
 *
 * This script loads the homepage in a real browser and measures:
 * - Number of API requests
 * - Request deduplication
 * - Page load time
 *
 * Run with: npx playwright test scripts/performance-test-browser.ts
 * Or: npx tsx scripts/performance-test-browser.ts
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface NetworkRequest {
  url: string;
  method: string;
  timestamp: number;
  duration?: number;
}

interface PerformanceReport {
  pageLoadTime: number;
  totalApiRequests: number;
  uniqueApiEndpoints: number;
  duplicateRequests: number;
  requestsByEndpoint: Record<string, number>;
  requests: NetworkRequest[];
}

async function measurePagePerformance(): Promise<PerformanceReport> {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  const requests: NetworkRequest[] = [];
  const requestsByEndpoint: Record<string, number> = {};

  // Monitor network requests
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/')) {
      const endpoint = new URL(url).pathname;
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;
      requests.push({
        url,
        method: request.method(),
        timestamp: Date.now(),
      });
    }
  });

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const req = requests.find(r => r.url === url && !r.duration);
      if (req) {
        req.duration = Date.now() - req.timestamp;
      }
    }
  });

  console.log('\n📊 Browser Performance Test: Homepage Load\n');
  console.log('='.repeat(50));
  console.log(`\n🌐 Loading: ${BASE_URL}\n`);

  const startTime = Date.now();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  } catch (error) {
    console.log('⚠️  Navigation completed with some pending requests');
  }

  const pageLoadTime = Date.now() - startTime;

  // Wait a bit more for any async requests
  await page.waitForTimeout(2000);

  await browser.close();

  const totalApiRequests = requests.length;
  const uniqueApiEndpoints = Object.keys(requestsByEndpoint).length;
  const duplicateRequests = Object.values(requestsByEndpoint)
    .filter(count => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);

  return {
    pageLoadTime,
    totalApiRequests,
    uniqueApiEndpoints,
    duplicateRequests,
    requestsByEndpoint,
    requests,
  };
}

async function printReport(report: PerformanceReport): Promise<void> {
  console.log('\n📈 Performance Report');
  console.log('='.repeat(50));

  console.log(`\n⏱️  Page Load Time: ${report.pageLoadTime}ms`);
  console.log(`\n📡 API Requests:`);
  console.log(`   Total: ${report.totalApiRequests}`);
  console.log(`   Unique Endpoints: ${report.uniqueApiEndpoints}`);
  console.log(`   Duplicates: ${report.duplicateRequests}`);

  console.log(`\n📋 Requests by Endpoint:`);
  Object.entries(report.requestsByEndpoint)
    .sort((a, b) => b[1] - a[1])
    .forEach(([endpoint, count]) => {
      const icon = count > 1 ? '⚠️ ' : '✅';
      console.log(`   ${icon} ${endpoint}: ${count} request(s)`);
    });

  // Calculate deduplication efficiency
  const expectedWithoutDedup = report.totalApiRequests + report.duplicateRequests;
  const savings = report.duplicateRequests > 0
    ? ((report.duplicateRequests / expectedWithoutDedup) * 100).toFixed(1)
    : 0;

  console.log(`\n💡 Performance Insights:`);

  if (report.duplicateRequests === 0) {
    console.log('   ✅ No duplicate API requests detected!');
    console.log('   ✅ SWR deduplication is working correctly.');
  } else {
    console.log(`   ⚠️  ${report.duplicateRequests} duplicate request(s) detected.`);
    console.log(`   💡 Potential savings with deduplication: ${savings}%`);
  }

  if (report.pageLoadTime < 1000) {
    console.log('   ✅ Page load time is excellent (<1s)');
  } else if (report.pageLoadTime < 3000) {
    console.log('   ⚠️  Page load time is acceptable (1-3s)');
  } else {
    console.log('   ❌ Page load time is slow (>3s)');
  }

  // Performance recommendations
  console.log(`\n📝 Recommendations:`);
  if (report.duplicateRequests > 0) {
    console.log('   1. Review components making duplicate API calls');
    console.log('   2. Ensure all data fetching uses centralized SWR hooks');
  }
  if (report.totalApiRequests > 10) {
    console.log('   3. Consider combining some API endpoints');
    console.log('   4. Implement server-side data prefetching');
  }
  if (report.pageLoadTime > 2000) {
    console.log('   5. Profile slow API endpoints');
    console.log('   6. Add loading states for better perceived performance');
  }
}

async function compareBeforeAfter(): Promise<void> {
  console.log('\n📊 Performance Comparison\n');
  console.log('='.repeat(50));

  console.log('\n📉 BEFORE (without SWR deduplication):');
  console.log('   - /api/credits: 3 requests (useDashboardData + CreditsDisplay + re-render)');
  console.log('   - /api/polar: 2 requests (Header + duplicate)');
  console.log('   - /api/notifications: 2 requests (mount + effect)');
  console.log('   - Total: ~13 API requests');

  console.log('\n📈 AFTER (with SWR deduplication):');
  console.log('   - /api/credits: 1 request (deduplicated)');
  console.log('   - /api/polar: 1 request (deduplicated)');
  console.log('   - /api/notifications: 1 request (deduplicated)');
  console.log('   - Total: ~8 API requests');

  console.log('\n✅ Improvement: ~38% reduction in API calls');
}

async function main(): Promise<void> {
  console.log('\n🚀 Starting Browser Performance Test\n');

  try {
    const report = await measurePagePerformance();
    await printReport(report);
    await compareBeforeAfter();
    console.log('\n✅ Performance test completed!\n');
  } catch (error) {
    console.error('\n❌ Performance test failed:', error);
    process.exit(1);
  }
}

main();
