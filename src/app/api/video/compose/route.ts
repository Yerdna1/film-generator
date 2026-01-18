// Video Composition API Route - Renders final video with VectCutAPI on Modal
// Supports: MP4 rendering, CapCut draft export, SRT subtitles

import { NextRequest, NextResponse } from 'next/server';

// Export maxDuration from compose handler
export { maxDuration } from './handlers/compose';

// POST - Start video composition job
export { POST } from './handlers/compose';

// GET - Check composition job status
export { GET } from './handlers/status';

// OPTIONS - Return CORS headers for preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
