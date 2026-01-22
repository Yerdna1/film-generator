import { NextRequest, NextResponse } from 'next/server';
import { getProviderConfig } from '@/lib/providers';
import { callExternalApi } from '@/lib/providers/api-wrapper';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'cmkoj5cjb000foy45jx3it2ny';

    // Get TTS provider configuration
    const config = await getProviderConfig({
      userId,
      type: 'tts',
    });

    console.log('[Debug TTS] Provider config:', JSON.stringify(config, null, 2));

    if (!config.apiKey) {
      return NextResponse.json({
        error: 'No API key configured for TTS',
        config: {
          provider: config.provider,
          model: config.model,
          hasApiKey: false,
        },
      }, { status: 400 });
    }

    // Test KIE createTask for TTS
    // Map UI model names to KIE API model names
    const KIE_TTS_MODEL_MAPPING: Record<string, string> = {
      'elevenlabs-turbo-2-5': 'elevenlabs/text-to-speech-turbo-2-5',
      'elevenlabs-turbo': 'elevenlabs/text-to-speech-turbo-2-5',
      'elevenlabs-v2': 'elevenlabs/text-to-speech-multilingual-v2',
      'elevenlabs-multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
      'elevenlabs-dialogue-v3': 'elevenlabs/text-to-dialogue-v3',
    };

    const rawModel = config.model || 'elevenlabs/text-to-speech-turbo-2-5';
    const kieModel = KIE_TTS_MODEL_MAPPING[rawModel] || rawModel;

    const requestBody = {
      model: kieModel,
      input: {
        text: 'This is a test.',
        voice_id: 'adam',
      },
    };

    console.log('[Debug TTS] Model mapping:', {
      configModel: config.model,
      rawModel,
      mappedModel: kieModel,
      mappingFound: KIE_TTS_MODEL_MAPPING[rawModel] !== undefined,
    });

    console.log('[Debug TTS] Request body:', JSON.stringify(requestBody, null, 2));

    // Make API call
    const response = await callExternalApi({
      userId,
      type: 'tts',
      body: requestBody,
      showLoadingMessage: false,
    });

    console.log('[Debug TTS] API response:', JSON.stringify({
      status: response.status,
      provider: response.provider,
      model: response.model,
      hasData: !!response.data,
      error: response.error,
      dataKeys: response.data ? Object.keys(response.data) : null,
      dataPreview: response.data ? JSON.stringify(response.data).substring(0, 500) : null,
    }, null, 2));

    if (response.error) {
      return NextResponse.json({
        error: response.error,
        config: {
          provider: config.provider,
          model: config.model,
          rawModel,
          kieModel,
          hasApiKey: true,
        },
        requestBody,
        response: {
          status: response.status,
          error: response.error,
        },
      }, { status: 500 });
    }

    // Check for task ID
    const responseData = response.data;
    const taskId = responseData?.data?.taskId;

    if (!taskId) {
      return NextResponse.json({
        error: 'No task ID in response',
        config: {
          provider: config.provider,
          model: config.model,
          rawModel,
          kieModel,
          hasApiKey: true,
        },
        requestBody,
        response: {
          status: response.status,
          hasResponseData: !!responseData,
          responseDataType: typeof responseData,
          responseDataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
          hasNestedData: !!responseData?.data,
          nestedDataType: typeof responseData?.data,
          nestedDataKeys: responseData?.data && typeof responseData.data === 'object' ? Object.keys(responseData.data) : null,
          fullResponse: responseData,
        },
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      config: {
        provider: config.provider,
        model: config.model,
        rawModel,
        kieModel,
        hasApiKey: true,
      },
      requestBody,
      createTaskResponse: {
        status: response.status,
        taskId,
        dataKeys: Object.keys(responseData),
      },
    });

  } catch (error) {
    console.error('[Debug TTS] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
