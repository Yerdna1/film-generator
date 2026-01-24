import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    console.error('[Proxy] Missing URL parameter');
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  console.log('[Proxy] Fetching:', url);

  // Only allow specific domains for security
  const allowedDomains = [
    's3.eu-central-1.amazonaws.com',
    's3.amazonaws.com',
    'film-generator-andrej-2026.s3.eu-central-1.amazonaws.com',
    'aiquickdraw.com',
    'tempfile.aiquickdraw.com',
  ];

  try {
    const parsedUrl = new URL(url);
    const isAllowed = allowedDomains.some(domain => parsedUrl.hostname.includes(domain));

    if (!isAllowed) {
      console.error('[Proxy] Domain not allowed:', parsedUrl.hostname);
      return NextResponse.json({ error: 'Domain not allowed', domain: parsedUrl.hostname }, { status: 403 });
    }

    console.log('[Proxy] Domain allowed, fetching from S3...');

    const response = await fetch(url, {
      // Don't follow redirects automatically to handle any S3 redirect issues
      redirect: 'follow',
    });

    console.log('[Proxy] Response status:', response.status, 'ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Proxy] Failed to fetch:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    console.log('[Proxy] Success! Blob size:', blob.size, 'type:', blob.type);

    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Length', blob.size.toString());
    // Add CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET');

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch resource', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
