import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

/**
 * Public endpoint to check if VectCut endpoint is available.
 * Returns user's configured endpoint if authenticated, or server default if available.
 * This allows unauthenticated users to access video composition when server has default endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user has their own endpoint configured
    let userEndpoint: string | null = null;

    if (session?.user?.id) {
      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
        select: { modalVectcutEndpoint: true },
      });

      userEndpoint = apiKeys?.modalVectcutEndpoint || null;
    }

    // Check if server has a default endpoint configured
    const serverEndpoint = process.env.VECTCUT_ENDPOINT || process.env.MODAL_VECTCUT_ENDPOINT || null;

    // Default demo endpoint for all users (fallback when no user/server endpoint configured)
    const demoEndpoint = 'https://your-vectcut-app.modal.run';

    // Use user's endpoint if configured, otherwise fall back to server endpoint, then demo endpoint
    const endpoint = userEndpoint || serverEndpoint || demoEndpoint;

    return NextResponse.json({
      hasEndpoint: true, // Always true now with demo endpoint
      endpoint: endpoint || '',
      isUserEndpoint: !!userEndpoint,
      isServerEndpoint: !!serverEndpoint && !userEndpoint,
      isDemoEndpoint: !userEndpoint && !serverEndpoint,
    });
  } catch (error) {
    console.error('Error checking VectCut endpoint:', error);

    // Return demo endpoint as fallback even on error
    return NextResponse.json(
      {
        hasEndpoint: true,
        endpoint: 'https://your-vectcut-app.modal.run',
        isUserEndpoint: false,
        isServerEndpoint: false,
        isDemoEndpoint: true,
      },
      { status: 200 }
    );
  }
}
