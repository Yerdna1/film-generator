import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// GET user constants
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let constants = await prisma.userConstants.findUnique({
      where: { userId: session.user.id },
    });

    // Create default constants if not exist
    if (!constants) {
      constants = await prisma.userConstants.create({
        data: {
          userId: session.user.id,
          characterImageProvider: 'gemini',
          characterAspectRatio: '1:1',
          sceneImageProvider: 'gemini',
          sceneImageResolution: '2k',
          sceneAspectRatio: '16:9',
          videoResolution: 'hd',
        },
      });
    }

    return NextResponse.json(constants);
  } catch (error) {
    console.error('Error fetching user constants:', error);
    return NextResponse.json({ error: 'Failed to fetch user constants' }, { status: 500 });
  }
}

// PUT update user constants
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      characterImageProvider,
      characterAspectRatio,
      sceneImageProvider,
      sceneImageResolution,
      sceneAspectRatio,
      videoResolution,
    } = body;

    // Validate allowed values
    const allowedProviders = ['gemini', 'modal', 'modal-edit'];
    const allowedAspectRatios = ['1:1', '16:9', '21:9', '4:3', '9:16', '3:4'];
    const allowedResolutions = ['1k', '2k', '4k'];
    const allowedVideoResolutions = ['hd', '4k'];

    if (
      (characterImageProvider && !allowedProviders.includes(characterImageProvider)) ||
      (sceneImageProvider && !allowedProviders.includes(sceneImageProvider))
    ) {
      return NextResponse.json({ error: 'Invalid image provider' }, { status: 400 });
    }

    if (
      (characterAspectRatio && !allowedAspectRatios.includes(characterAspectRatio)) ||
      (sceneAspectRatio && !allowedAspectRatios.includes(sceneAspectRatio))
    ) {
      return NextResponse.json({ error: 'Invalid aspect ratio' }, { status: 400 });
    }

    if (sceneImageResolution && !allowedResolutions.includes(sceneImageResolution)) {
      return NextResponse.json({ error: 'Invalid image resolution' }, { status: 400 });
    }

    if (videoResolution && !allowedVideoResolutions.includes(videoResolution)) {
      return NextResponse.json({ error: 'Invalid video resolution' }, { status: 400 });
    }

    const constants = await prisma.userConstants.upsert({
      where: { userId: session.user.id },
      update: {
        ...(characterImageProvider !== undefined && { characterImageProvider }),
        ...(characterAspectRatio !== undefined && { characterAspectRatio }),
        ...(sceneImageProvider !== undefined && { sceneImageProvider }),
        ...(sceneImageResolution !== undefined && { sceneImageResolution }),
        ...(sceneAspectRatio !== undefined && { sceneAspectRatio }),
        ...(videoResolution !== undefined && { videoResolution }),
      },
      create: {
        userId: session.user.id,
        characterImageProvider: characterImageProvider || 'gemini',
        characterAspectRatio: characterAspectRatio || '1:1',
        sceneImageProvider: sceneImageProvider || 'gemini',
        sceneImageResolution: sceneImageResolution || '2k',
        sceneAspectRatio: sceneAspectRatio || '16:9',
        videoResolution: videoResolution || 'hd',
      },
    });

    return NextResponse.json(constants);
  } catch (error) {
    console.error('Error updating user constants:', error);
    return NextResponse.json({ error: 'Failed to update user constants' }, { status: 500 });
  }
}
