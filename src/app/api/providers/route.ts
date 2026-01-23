import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';
import { unstable_cache } from 'next/cache';

// Cache providers for 5 minutes
const getCachedProviders = unstable_cache(
  async (modality?: string) => {
    const where: any = { isActive: true };

    // If modality is specified, filter providers that support it
    if (modality) {
      where.supportedModalities = {
        has: modality
      };
    }

    const providers = await prisma.provider.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { displayName: 'asc' }
      ],
    });

    return providers;
  },
  ['providers'],
  {
    revalidate: 300, // 5 minutes
    tags: ['providers'],
  }
);

export async function GET(request: NextRequest) {
  try {
    // Get session to ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get modality query parameter
    const searchParams = request.nextUrl.searchParams;
    const modality = searchParams.get('modality') || undefined;

    // Validate modality if provided
    const validModalities = ['llm', 'image', 'video', 'tts', 'music'];
    if (modality && !validModalities.includes(modality)) {
      return NextResponse.json(
        { error: 'Invalid modality. Must be one of: llm, image, video, tts, music' },
        { status: 400 }
      );
    }

    // Get providers from database
    const providers = await getCachedProviders(modality);

    // Transform providers to match frontend expectations
    const transformedProviders = providers.map(provider => ({
      id: provider.providerId,
      providerId: provider.providerId,
      name: provider.name,
      displayName: provider.displayName,
      icon: provider.icon,
      color: provider.color,
      description: provider.description,
      apiKeyField: provider.apiKeyField,
      modelField: provider.modelField,
      supportedModalities: provider.supportedModalities,
      isDefault: provider.isDefault,
      requiresEndpoint: provider.requiresEndpoint,
      helpLink: provider.helpLink,
      setupGuide: provider.setupGuide ? JSON.parse(provider.setupGuide as string) : undefined,
    }));

    return NextResponse.json(
      { providers: transformedProviders },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

// Admin endpoint to create provider (future implementation)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TODO: Implement provider creation
    return NextResponse.json(
      { error: 'Not implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error creating provider:', error);
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
}