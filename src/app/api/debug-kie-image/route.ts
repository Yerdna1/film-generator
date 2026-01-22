import { NextRequest, NextResponse } from 'next/server';
import { getProviderConfig } from '@/lib/providers';
import { callExternalApi } from '@/lib/providers/api-wrapper';
import { buildApiUrl } from '@/lib/constants/api-endpoints';

export async function GET(request: NextRequest) {
  try {
    // Test with a simple prompt
    const testPrompt = "A beautiful sunset over mountains";
    const userId = request.headers.get('x-user-id') || 'cmkoj5cjb000foy45jx3it2ny'; // Your user ID from the API keys

    // Get provider configuration
    const config = await getProviderConfig({
      userId,
      type: 'image',
    });

    console.log('[Debug KIE] Provider config:', JSON.stringify(config, null, 2));

    // Build request body with KIE createTask format
    const requestBody = {
      model: config.model || 'flux-kontext-dev/max',
      input: {
        prompt: testPrompt,
        aspect_ratio: '16:9',
      },
    };

    console.log('[Debug KIE] Request body:', JSON.stringify(requestBody, null, 2));

    // Make API call
    const response = await callExternalApi({
      userId,
      type: 'image',
      body: requestBody,
      showLoadingMessage: false,
    });

    console.log('[Debug KIE] Response:', JSON.stringify({
      status: response.status,
      provider: response.provider,
      model: response.model,
      hasData: !!response.data,
      error: response.error,
      dataKeys: response.data ? Object.keys(response.data) : null,
      dataPreview: response.data ? JSON.stringify(response.data).substring(0, 200) : null,
    }, null, 2));

    if (response.error) {
      return NextResponse.json({
        error: response.error,
        config,
        requestBody,
        response,
      }, { status: 500 });
    }

    // Check for task ID
    const taskId = response.data?.data?.taskId;

    if (!taskId) {
      return NextResponse.json({
        error: 'No task ID in response',
        config,
        requestBody,
        response: {
          ...response,
          fullData: response.data,
        },
      }, { status: 500 });
    }

    // Try to fetch the task status once
    const KIE_API_URL = 'https://api.kie.ai';
    const statusResponse = await fetch(`${KIE_API_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    const statusData = await statusResponse.json();

    return NextResponse.json({
      success: true,
      config: {
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey,
        apiKeyLength: config.apiKey?.length,
      },
      requestBody,
      createTaskResponse: {
        status: response.status,
        taskId,
        dataKeys: Object.keys(response.data),
      },
      taskStatus: {
        ok: statusResponse.ok,
        status: statusResponse.status,
        state: statusData.data?.state,
        dataKeys: statusData.data ? Object.keys(statusData.data) : null,
      },
    });

  } catch (error) {
    console.error('[Debug KIE] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}