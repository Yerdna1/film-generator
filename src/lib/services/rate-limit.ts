/**
 * In-memory rate limiter for API routes
 *
 * Features:
 * - Sliding window algorithm for smooth rate limiting
 * - Per-user and per-IP tracking
 * - Configurable limits per route type
 * - Auto-cleanup of expired entries
 *
 * Note: For multi-instance deployments, replace with Redis-based solution
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Rate limit configuration per route type
export const RATE_LIMITS = {
  // Standard API endpoints
  default: { windowMs: 60_000, maxRequests: 100 },

  // Auth endpoints (stricter to prevent brute force)
  auth: { windowMs: 60_000, maxRequests: 10 },

  // AI generation endpoints (expensive operations)
  generation: { windowMs: 60_000, maxRequests: 20 },

  // Admin endpoints
  admin: { windowMs: 60_000, maxRequests: 50 },

  // Webhook endpoints (generous limits for external services)
  webhook: { windowMs: 60_000, maxRequests: 200 },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitEntry {
  count: number;
  windowStart: number;
  requests: number[];  // Timestamps for sliding window
}

// In-memory store for rate limiting
// Key format: `${identifier}:${routeType}`
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(r => r.windowMs));

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > maxWindow * 2) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client identifier for rate limiting
 * Prioritizes: authenticated user ID > IP address
 */
function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

/**
 * Check if request should be rate limited using sliding window
 */
function isRateLimited(
  identifier: string,
  routeType: RateLimitType
): { limited: boolean; remaining: number; resetAt: number } {
  cleanupExpiredEntries();

  const { windowMs, maxRequests } = RATE_LIMITS[routeType];
  const key = `${identifier}:${routeType}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = { count: 0, windowStart: now, requests: [] };
    rateLimitStore.set(key, entry);
  }

  // Filter out requests outside the current window (sliding window)
  entry.requests = entry.requests.filter(timestamp => now - timestamp < windowMs);

  const remaining = Math.max(0, maxRequests - entry.requests.length);
  const resetAt = entry.requests.length > 0
    ? entry.requests[0] + windowMs
    : now + windowMs;

  if (entry.requests.length >= maxRequests) {
    return { limited: true, remaining: 0, resetAt };
  }

  // Add current request to the window
  entry.requests.push(now);

  return { limited: false, remaining: remaining - 1, resetAt };
}

/**
 * Rate limit middleware for API routes
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, 'generation');
 *   if (rateLimitResult) return rateLimitResult;
 *   // ... rest of handler
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  routeType: RateLimitType = 'default'
): Promise<NextResponse | null> {
  // Get user ID if authenticated
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = session?.user?.id;
  } catch {
    // Ignore auth errors for rate limiting
  }

  const identifier = getClientIdentifier(request, userId);
  const { limited, remaining, resetAt } = isRateLimited(identifier, routeType);

  if (limited) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMITS[routeType].maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  routeType: RateLimitType,
  currentRemaining: number,
  resetAt: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[routeType].maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(currentRemaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return response;
}

/**
 * Get current rate limit status without consuming a request
 */
export function getRateLimitStatus(
  identifier: string,
  routeType: RateLimitType
): { remaining: number; resetAt: number } {
  const { windowMs, maxRequests } = RATE_LIMITS[routeType];
  const key = `${identifier}:${routeType}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { remaining: maxRequests, resetAt: now + windowMs };
  }

  const validRequests = entry.requests.filter(timestamp => now - timestamp < windowMs);
  const remaining = Math.max(0, maxRequests - validRequests.length);
  const resetAt = validRequests.length > 0
    ? validRequests[0] + windowMs
    : now + windowMs;

  return { remaining, resetAt };
}
