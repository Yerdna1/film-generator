// Provider Health Check Endpoint
// GET /api/v2/providers/health

import { NextRequest, NextResponse } from 'next/server';
import { checkAllProviders, listProviders, type GenerationType } from '@/lib/providers';
import { optionalAuth } from '@/lib/api/middleware';

// Health metrics storage (in production, use Redis or similar)
const healthMetrics = new Map<string, {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  latency: number;
  successRate: number;
  recentErrors: Array<{ timestamp: Date; error: string }>;
}>();

export async function GET(request: NextRequest) {
  const auth = await optionalAuth();
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as GenerationType | null;

  try {
    // Get all providers
    const providers = listProviders(type || undefined);

    // Check health for each provider type
    const healthChecks = await Promise.all(
      providers.map(async (metadata) => {
        const key = `${metadata.type}:${metadata.provider}`;
        const cached = healthMetrics.get(key);

        // Use cached data if recent (within 5 minutes)
        if (cached && (Date.now() - cached.lastCheck.getTime() < 5 * 60 * 1000)) {
          return {
            type: metadata.type,
            provider: metadata.provider,
            ...cached,
          };
        }

        // Perform health check
        const startTime = Date.now();
        try {
          // Try to validate provider config (requires auth)
          if (auth?.userId) {
            const results = await checkAllProviders(metadata.type, {
              // Provider config partial - no userId needed here
            });

            const isHealthy = results[metadata.provider];
            const latency = Date.now() - startTime;

            const health = {
              status: (isHealthy ? 'healthy' : 'unhealthy') as 'healthy' | 'degraded' | 'unhealthy',
              lastCheck: new Date(),
              latency,
              successRate: isHealthy ? 1.0 : 0.0,
              recentErrors: isHealthy ? [] : [{ timestamp: new Date(), error: 'Validation failed' }],
            };

            healthMetrics.set(key, health);

            return {
              type: metadata.type,
              provider: metadata.provider,
              ...health,
            };
          } else {
            // Without auth, return basic metadata
            return {
              type: metadata.type,
              provider: metadata.provider,
              status: 'unknown' as const,
              message: 'Authentication required for health check',
              metadata,
            };
          }
        } catch (error) {
          const latency = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          const existing = healthMetrics.get(key);
          const recentErrors = existing?.recentErrors || [];
          recentErrors.push({ timestamp: new Date(), error: errorMessage });

          // Keep only last 10 errors
          if (recentErrors.length > 10) {
            recentErrors.shift();
          }

          const health = {
            status: 'unhealthy' as const,
            lastCheck: new Date(),
            latency,
            successRate: 0.0,
            recentErrors,
          };

          healthMetrics.set(key, health);

          return {
            type: metadata.type,
            provider: metadata.provider,
            ...health,
          };
        }
      })
    );

    // Calculate aggregate health
    const totalProviders = healthChecks.length;
    const healthyProviders = healthChecks.filter(h => h.status === 'healthy').length;
    const overallHealth = healthyProviders / totalProviders;

    return NextResponse.json({
      status: overallHealth >= 0.8 ? 'healthy' : overallHealth >= 0.5 ? 'degraded' : 'critical',
      timestamp: new Date().toISOString(),
      summary: {
        total: totalProviders,
        healthy: healthyProviders,
        degraded: healthChecks.filter(h => h.status === 'degraded').length,
        unhealthy: healthChecks.filter(h => h.status === 'unhealthy').length,
      },
      providers: healthChecks,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}