import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

function maskApiKey(key: string | null): string {
  if (!key || key.length < 8) return '';
  return `${'•'.repeat(Math.min(key.length - 4, 20))}${key.slice(-4)}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!session.user?.email) {
      return NextResponse.json({ error: 'No email in session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    // Get organization API keys
    const orgKeys = await prisma.organizationApiKeys.findFirst();

    if (!orgKeys) {
      // Return empty state if no organization keys exist
      return NextResponse.json({
        hasGeminiKey: false,
        hasGrokKey: false,
        hasKieKey: false,
        hasElevenLabsKey: false,
        hasClaudeKey: false,
        hasOpenaiKey: false,
        hasNanoBananaKey: false,
        hasSunoKey: false,
        hasOpenRouterKey: false,
        hasPiapiKey: false,
        kieImageModel: null,
        kieVideoModel: null,
        kieTtsModel: null,
        kieMusicModel: null,
        openRouterModel: null,
        modalLlmEndpoint: null,
        modalTtsEndpoint: null,
        modalImageEndpoint: null,
        modalImageEditEndpoint: null,
        modalVideoEndpoint: null,
        modalMusicEndpoint: null,
        modalVectcutEndpoint: null,
      });
    }

    // Return masked keys and configuration
    return NextResponse.json({
      // API Keys (masked)
      geminiApiKey: maskApiKey(orgKeys.geminiApiKey),
      grokApiKey: maskApiKey(orgKeys.grokApiKey),
      kieApiKey: maskApiKey(orgKeys.kieApiKey),
      elevenLabsApiKey: maskApiKey(orgKeys.elevenLabsApiKey),
      claudeApiKey: maskApiKey(orgKeys.claudeApiKey),
      openaiApiKey: maskApiKey(orgKeys.openaiApiKey),
      nanoBananaApiKey: maskApiKey(orgKeys.nanoBananaApiKey),
      sunoApiKey: maskApiKey(orgKeys.sunoApiKey),
      openRouterApiKey: maskApiKey(orgKeys.openRouterApiKey),
      piapiApiKey: maskApiKey(orgKeys.piapiApiKey),

      // Boolean flags
      hasGeminiKey: !!orgKeys.geminiApiKey,
      hasGrokKey: !!orgKeys.grokApiKey,
      hasKieKey: !!orgKeys.kieApiKey,
      hasElevenLabsKey: !!orgKeys.elevenLabsApiKey,
      hasClaudeKey: !!orgKeys.claudeApiKey,
      hasOpenaiKey: !!orgKeys.openaiApiKey,
      hasNanoBananaKey: !!orgKeys.nanoBananaApiKey,
      hasSunoKey: !!orgKeys.sunoApiKey,
      hasOpenRouterKey: !!orgKeys.openRouterApiKey,
      hasPiapiKey: !!orgKeys.piapiApiKey,

      // Model selections
      kieImageModel: orgKeys.kieImageModel,
      kieVideoModel: orgKeys.kieVideoModel,
      kieTtsModel: orgKeys.kieTtsModel,
      kieMusicModel: orgKeys.kieMusicModel,
      openRouterModel: orgKeys.openRouterModel,

      // Modal endpoints
      modalLlmEndpoint: orgKeys.modalLlmEndpoint,
      modalTtsEndpoint: orgKeys.modalTtsEndpoint,
      modalImageEndpoint: orgKeys.modalImageEndpoint,
      modalImageEditEndpoint: orgKeys.modalImageEditEndpoint,
      modalVideoEndpoint: orgKeys.modalVideoEndpoint,
      modalMusicEndpoint: orgKeys.modalMusicEndpoint,
      modalVectcutEndpoint: orgKeys.modalVectcutEndpoint,

      // Metadata
      lastUpdatedBy: orgKeys.lastUpdatedBy,
      updatedAt: orgKeys.updatedAt,
    });
  } catch (error) {
    console.error('Failed to fetch organization API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch organization API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!session.user?.email) {
      return NextResponse.json({ error: 'No email in session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    const data = await request.json();

    // Remove any empty string values
    const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Check if organization keys exist
    const existingKeys = await prisma.organizationApiKeys.findFirst();

    if (existingKeys) {
      // Update existing keys
      const updatedKeys = await prisma.organizationApiKeys.update({
        where: { id: existingKeys.id },
        data: {
          ...cleanedData,
          lastUpdatedBy: user.id,
        },
      });
      return NextResponse.json({ success: true, id: updatedKeys.id });
    } else {
      // Create new organization keys
      const newKeys = await prisma.organizationApiKeys.create({
        data: {
          ...cleanedData,
          lastUpdatedBy: user.id,
        },
      });
      return NextResponse.json({ success: true, id: newKeys.id });
    }
  } catch (error) {
    console.error('Failed to update organization API keys:', error);
    return NextResponse.json({ error: 'Failed to update organization API keys' }, { status: 500 });
  }
}