import { NextRequest, NextResponse } from 'next/server';
import { getProviderConfig } from '@/lib/providers';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'cmkoj5cjb000foy45jx3it2ny';

    // Map UI model names to KIE API model names
    const KIE_TTS_MODEL_MAPPING: Record<string, string> = {
      'elevenlabs-turbo-2-5': 'elevenlabs/text-to-speech-turbo-2-5',
      'elevenlabs-turbo': 'elevenlabs/text-to-speech-turbo-2-5',
      'elevenlabs-v2': 'elevenlabs/text-to-speech-multilingual-v2',
      'elevenlabs-multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
      'elevenlabs-dialogue-v3': 'elevenlabs/text-to-dialogue-v3',
    };

    const config = await getProviderConfig({
      userId,
      type: 'tts',
    });

    const rawModel = config.model || 'elevenlabs/text-to-speech-turbo-2-5';
    const kieModel = KIE_TTS_MODEL_MAPPING[rawModel] || rawModel;

    // Step 1: Create task
    const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: kieModel,
        input: {
          text: 'This is a test.',
          voice_id: 'adam',
        },
      }),
    });

    const createData = await createResponse.json();
    const taskId = createData.data?.taskId;

    if (!taskId) {
      return NextResponse.json({
        error: 'Failed to create task',
        createResponse: createData,
      }, { status: 500 });
    }

    console.log('[Debug KIE TTS Task] Task created:', taskId);

    // Step 2: Poll for completion
    let attempts = 0;
    const maxAttempts = 30;
    let taskData = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await fetch(
        `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        }
      );

      const statusData = await statusResponse.json();

      if (statusData.code !== 200) {
        return NextResponse.json({
          error: 'Failed to check task status',
          statusResponse: statusData,
        }, { status: 500 });
      }

      taskData = statusData.data;
      const state = taskData?.state;

      console.log('[Debug KIE TTS Task] State:', state, 'Attempt:', attempts + 1);

      if (state === 'success') {
        break;
      }

      if (state === 'fail') {
        return NextResponse.json({
          error: 'Task failed',
          failReason: taskData?.fail_reason || taskData?.resultJson?.error || 'Unknown error',
          taskData,
        }, { status: 500 });
      }

      attempts++;
    }

    if (!taskData || taskData.state !== 'success') {
      return NextResponse.json({
        error: 'Task timed out or did not complete',
        finalState: taskData?.state,
        taskData,
      }, { status: 500 });
    }

    // Step 3: Analyze the result structure
    console.log('[Debug KIE TTS Task] Task completed, analyzing result...');

    return NextResponse.json({
      success: true,
      taskId,
      resultAnalysis: {
        hasResultJson: !!taskData.resultJson,
        resultJsonType: typeof taskData.resultJson,
        resultJsonString: typeof taskData.resultJson === 'string' ? taskData.resultJson : JSON.stringify(taskData.resultJson, null, 2),
        hasResultUrl: !!taskData.resultUrl,
        resultUrl: taskData.resultUrl,
        hasImageUrl: !!taskData.imageUrl,
        imageUrl: taskData.imageUrl,
        allKeys: Object.keys(taskData),
        taskDataPreview: JSON.stringify(taskData, null, 2).substring(0, 2000),
      },
    });

  } catch (error) {
    console.error('[Debug KIE TTS Task] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
