// Video Composition - GET Handler (Status Check)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getJobStatus, getProjectJob } from '../services/job-manager';

/**
 * GET handler for checking composition job status
 * Supports both jobId and projectId query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const projectId = searchParams.get('projectId');

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (jobId) {
      // Get specific job
      const job = await getJobStatus(jobId, session.user.id);

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json(job);
    }

    if (projectId) {
      // Get latest job for project
      const job = await getProjectJob(projectId, session.user.id);

      if (!job) {
        return NextResponse.json({ status: 'none' });
      }

      return NextResponse.json(job);
    }

    return NextResponse.json({ error: 'Job ID or Project ID required' }, { status: 400 });
  } catch (error) {
    console.error('Composition status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
