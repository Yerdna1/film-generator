import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPublicProjects } from '@/lib/permissions';
import { cache, cacheTTL } from '@/lib/cache';

const PUBLIC_PROJECTS_CACHE_KEY = 'public-projects';

// GET - Fetch all public projects for discovery
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Create cache key with pagination
    const cacheKey = `${PUBLIC_PROJECTS_CACHE_KEY}:${limit}:${offset}`;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedResult = cache.get<ReturnType<typeof getPublicProjects>>(cacheKey);
      if (cachedResult) {
        return NextResponse.json(cachedResult, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    // Get public projects (exclude user's own projects for logged-in users)
    const result = await getPublicProjects({
      limit,
      offset,
      excludeUserId: userId || undefined,
    });

    // Cache for 10 minutes (public projects change less frequently)
    cache.set(cacheKey, result, cacheTTL.MEDIUM);

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Error fetching public projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public projects' },
      { status: 500 }
    );
  }
}
