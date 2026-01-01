// Regeneration Request Actions API
// PUT - Approve or reject a regeneration request
// DELETE - Cancel a pending request (requester only)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission, getUserProjectRole } from '@/lib/permissions';
import { checkBalance, getImageCreditCost, COSTS } from '@/lib/services/credits';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, requestId } = await params;
    const { approved, note } = await request.json();

    // Check approve permission (admin only)
    const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    // Get the request
    const regenerationRequest = await prisma.regenerationRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!regenerationRequest) {
      return NextResponse.json(
        { error: 'Regeneration request not found' },
        { status: 404 }
      );
    }

    if (regenerationRequest.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Request does not belong to this project' },
        { status: 400 }
      );
    }

    if (regenerationRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request is already ${regenerationRequest.status}` },
        { status: 400 }
      );
    }

    // Get project and scene info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, settings: true },
    });

    const scene = await prisma.scene.findUnique({
      where: { id: regenerationRequest.targetId },
      select: {
        id: true,
        title: true,
        number: true,
        textToImagePrompt: true,
        imageToVideoPrompt: true,
        imageUrl: true,
      },
    });

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    const requesterName = regenerationRequest.requester?.name ||
      regenerationRequest.requester?.email ||
      'Unknown';

    if (approved) {
      // Check if admin has enough credits
      const settings = project?.settings as { resolution?: string } | null;
      const resolution = settings?.resolution || '2k';
      const creditCost = regenerationRequest.targetType === 'image'
        ? getImageCreditCost(resolution as '1k' | '2k' | '4k')
        : COSTS.VIDEO_GENERATION;

      const balanceCheck = await checkBalance(session.user.id, creditCost);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: 'Insufficient credits to approve this request',
          required: creditCost,
          balance: balanceCheck.balance,
        }, { status: 402 });
      }

      // Update request status to approved
      await prisma.regenerationRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });

      // Get admin's API settings
      const apiKeys = await prisma.apiKeys.findUnique({
        where: { userId: session.user.id },
      });

      // Perform the regeneration
      let regenerationResult: { success: boolean; url?: string; error?: string };

      try {
        if (regenerationRequest.targetType === 'image') {
          // Call image generation API internally
          const imageResponse = await fetch(new URL('/api/image', request.url).origin + '/api/image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              prompt: scene.textToImagePrompt,
              aspectRatio: '16:9',
              resolution,
              projectId,
              isRegeneration: true,
              sceneId: scene.id,
              // Use special header to indicate admin-paid regeneration
              _adminPayment: {
                adminId: session.user.id,
                requestedBy: regenerationRequest.requesterId,
              },
            }),
          });

          const imageData = await imageResponse.json();

          if (imageResponse.ok && imageData.imageUrl) {
            // Update scene with new image
            await prisma.scene.update({
              where: { id: scene.id },
              data: { imageUrl: imageData.imageUrl },
            });
            regenerationResult = { success: true, url: imageData.imageUrl };
          } else {
            regenerationResult = { success: false, error: imageData.error || 'Image generation failed' };
          }
        } else {
          // Video regeneration
          if (!scene.imageUrl) {
            regenerationResult = { success: false, error: 'Scene has no image. Generate image first.' };
          } else {
            const videoResponse = await fetch(new URL('/api/video', request.url).origin + '/api/video', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || '',
              },
              body: JSON.stringify({
                imageUrl: scene.imageUrl,
                prompt: scene.imageToVideoPrompt,
                projectId,
                isRegeneration: true,
                sceneId: scene.id,
              }),
            });

            const videoData = await videoResponse.json();

            if (videoResponse.ok && (videoData.videoUrl || videoData.taskId)) {
              // For async video generation, we need to poll
              if (videoData.taskId) {
                regenerationResult = {
                  success: true,
                  url: undefined, // Will be updated when video completes
                };
                // Store taskId for later completion check
                await prisma.regenerationRequest.update({
                  where: { id: requestId },
                  data: {
                    status: 'approved', // Still approved, waiting for completion
                    errorMessage: JSON.stringify({ taskId: videoData.taskId }),
                  },
                });
              } else {
                await prisma.scene.update({
                  where: { id: scene.id },
                  data: { videoUrl: videoData.videoUrl },
                });
                regenerationResult = { success: true, url: videoData.videoUrl };
              }
            } else {
              regenerationResult = { success: false, error: videoData.error || 'Video generation failed' };
            }
          }
        }
      } catch (genError) {
        console.error('Regeneration error:', genError);
        regenerationResult = {
          success: false,
          error: genError instanceof Error ? genError.message : 'Regeneration failed',
        };
      }

      // Update request with final status
      if (regenerationResult.success) {
        await prisma.regenerationRequest.update({
          where: { id: requestId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        // Notify requester of completion
        await prisma.notification.create({
          data: {
            userId: regenerationRequest.requesterId,
            type: 'regeneration_completed',
            title: 'Regeneration Complete',
            message: `Your ${regenerationRequest.targetType} regeneration request for "${scene.title}" has been completed.`,
            metadata: {
              projectId,
              projectName: project?.name,
              requestId,
              targetType: regenerationRequest.targetType,
              sceneId: scene.id,
              sceneName: scene.title,
            },
            actionUrl: `/project/${projectId}`,
          },
        });

        return NextResponse.json({
          success: true,
          status: 'completed',
          url: regenerationResult.url,
        });
      } else {
        await prisma.regenerationRequest.update({
          where: { id: requestId },
          data: {
            status: 'failed',
            errorMessage: regenerationResult.error,
          },
        });

        // Notify requester of failure
        await prisma.notification.create({
          data: {
            userId: regenerationRequest.requesterId,
            type: 'regeneration_failed',
            title: 'Regeneration Failed',
            message: `Your ${regenerationRequest.targetType} regeneration request for "${scene.title}" failed: ${regenerationResult.error}`,
            metadata: {
              projectId,
              projectName: project?.name,
              requestId,
              targetType: regenerationRequest.targetType,
              sceneId: scene.id,
              error: regenerationResult.error,
            },
            actionUrl: `/project/${projectId}`,
          },
        });

        return NextResponse.json({
          success: false,
          status: 'failed',
          error: regenerationResult.error,
        }, { status: 500 });
      }
    } else {
      // Rejected
      await prisma.regenerationRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          userId: regenerationRequest.requesterId,
          type: 'request_rejected',
          title: 'Regeneration Request Rejected',
          message: `Your ${regenerationRequest.targetType} regeneration request for "${scene.title}" was rejected.${note ? ` Reason: ${note}` : ''}`,
          metadata: {
            projectId,
            projectName: project?.name,
            requestId,
            targetType: regenerationRequest.targetType,
            sceneId: scene.id,
            rejectionNote: note,
          },
          actionUrl: `/project/${projectId}`,
        },
      });

      return NextResponse.json({ success: true, status: 'rejected' });
    }
  } catch (error) {
    console.error('Process regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to process regeneration request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, requestId } = await params;

    // Get the request
    const regenerationRequest = await prisma.regenerationRequest.findUnique({
      where: { id: requestId },
    });

    if (!regenerationRequest) {
      return NextResponse.json(
        { error: 'Regeneration request not found' },
        { status: 404 }
      );
    }

    if (regenerationRequest.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Request does not belong to this project' },
        { status: 400 }
      );
    }

    // Only requester can cancel their own request, or admin can cancel any
    const isRequester = regenerationRequest.requesterId === session.user.id;
    const role = await getUserProjectRole(session.user.id, projectId);
    const isAdmin = role === 'admin';

    if (!isRequester && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only cancel your own requests' },
        { status: 403 }
      );
    }

    if (regenerationRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel a ${regenerationRequest.status} request` },
        { status: 400 }
      );
    }

    // Delete the request
    await prisma.regenerationRequest.delete({
      where: { id: requestId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel regeneration request' },
      { status: 500 }
    );
  }
}
