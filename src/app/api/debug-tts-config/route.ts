import { NextRequest, NextResponse } from 'next/server';
import { getProviderConfig } from '@/lib/providers';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'cmkoj5cjb000foy45jx3it2ny';

    // Get user settings
    const userSettings = await prisma.apiKeys.findUnique({
      where: { userId },
    });

    console.log('[Debug TTS Config] User settings:', JSON.stringify({
      ttsProvider: userSettings?.ttsProvider,
      kieTtsModel: userSettings?.kieTtsModel,
      hasKieApiKey: !!userSettings?.kieApiKey,
    }, null, 2));

    // Get provider config
    const config = await getProviderConfig({
      userId,
      type: 'tts',
    });

    return NextResponse.json({
      userSettings: {
        ttsProvider: userSettings?.ttsProvider,
        kieTtsModel: userSettings?.kieTtsModel,
        hasKieApiKey: !!userSettings?.kieApiKey,
      },
      providerConfig: {
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey,
      },
    });

  } catch (error) {
    console.error('[Debug TTS Config] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
