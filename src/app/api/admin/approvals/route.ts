// Admin Approvals API
// GET - Fetch all pending requests across all projects

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdmin } from '@/lib/admin';

// Default and maximum pagination limits
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify admin role from database
    const adminCheck = await verifyAdmin();
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));
    const skip = (page - 1) * limit;

    // Fetch counts and paginated requests in parallel
    const [
      deletionRequests,
      deletionCount,
      regenerationRequests,
      regenerationCount,
      promptEditRequests,
      promptEditCount,
    ] = await Promise.all([
      prisma.deletionRequest.findMany({
        where: { status: 'pending' },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deletionRequest.count({
        where: { status: 'pending' },
      }),
      prisma.regenerationRequest.findMany({
        where: { status: { in: ['pending', 'awaiting_final'] } },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.regenerationRequest.count({
        where: { status: { in: ['pending', 'awaiting_final'] } },
      }),
      prisma.promptEditRequest.findMany({
        where: { status: 'pending' },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.promptEditRequest.count({
        where: { status: 'pending' },
      }),
    ]);

    // For regeneration requests, also fetch scene info
    const sceneIds = regenerationRequests.map(r => r.targetId);
    const scenes = await prisma.scene.findMany({
      where: { id: { in: sceneIds } },
      select: {
        id: true,
        title: true,
        number: true,
        imageUrl: true,
        videoUrl: true,
      },
    });

    const sceneMap = new Map(scenes.map(s => [s.id, s]));

    const regenerationRequestsWithScenes = regenerationRequests.map(r => ({
      ...r,
      scene: sceneMap.get(r.targetId) || null,
    }));

    // Calculate pagination info
    const totalCount = deletionCount + regenerationCount + promptEditCount;
    const totalPages = Math.ceil(Math.max(deletionCount, regenerationCount, promptEditCount) / limit);

    return NextResponse.json({
      deletionRequests,
      regenerationRequests: regenerationRequestsWithScenes,
      promptEditRequests,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        counts: {
          deletions: deletionCount,
          regenerations: regenerationCount,
          promptEdits: promptEditCount,
        },
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Admin approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
