import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

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
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Length', blob.size.toString());

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 });
  }
}
