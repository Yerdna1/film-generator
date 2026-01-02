// Regeneration Request Actions API
// PUT - Approve or reject a regeneration request (admin)
// PATCH - Use attempt, select best, or final approve/reject
// DELETE - Cancel a pending request (requester only)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { verifyPermission, getUserProjectRole, getProjectAdmins } from '@/lib/permissions';
import { checkBalance, getImageCreditCost, spendCredits, COSTS } from '@/lib/services/credits';
import { deleteFromS3 } from '@/lib/services/s3-upload';

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
      // Calculate total cost for all attempts (3x)
      const settings = project?.settings as { resolution?: string } | null;
      const resolution = settings?.resolution || '2k';
      const costPerAttempt = regenerationRequest.targetType === 'image'
        ? getImageCreditCost(resolution as '1k' | '2k' | '4k')
        : COSTS.VIDEO_GENERATION;

      const maxAttempts = 3; // Default 3 attempts
      const totalCost = costPerAttempt * maxAttempts;

      // Check if admin has enough credits for all 3 attempts
      const balanceCheck = await checkBalance(session.user.id, totalCost);
      if (!balanceCheck.hasEnough) {
        return NextResponse.json({
          error: `Insufficient credits. Need ${totalCost} credits for ${maxAttempts} regeneration attempts (${costPerAttempt} each).`,
          required: totalCost,
          balance: balanceCheck.balance,
        }, { status: 402 });
      }

      // Deduct credits upfront for all 3 attempts
      const creditType = regenerationRequest.targetType === 'image' ? 'image' : 'video';
      const spendResult = await spendCredits(
        session.user.id,
        totalCost,
        creditType,
        `Regeneration approval: ${maxAttempts}x ${regenerationRequest.targetType} for "${scene.title}"`,
        projectId
      );

      if (!spendResult.success) {
        return NextResponse.json({
          error: spendResult.error || 'Failed to deduct credits',
        }, { status: 402 });
      }

      // Update request status to approved with prepaid credits
      const updatedRequest = await prisma.regenerationRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          maxAttempts,
          creditsPaid: totalCost,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });

      // Notify requester that their request was approved and they can now regenerate
      await prisma.notification.create({
        data: {
          userId: regenerationRequest.requesterId,
          type: 'request_approved',
          title: 'Regeneration Request Approved',
          message: `Your ${regenerationRequest.targetType} regeneration request for "${scene.title}" was approved! You can now regenerate it up to ${maxAttempts} times.`,
          metadata: {
            projectId,
            projectName: project?.name,
            requestId,
            targetType: regenerationRequest.targetType,
            sceneId: scene.id,
            sceneName: scene.title,
            maxAttempts,
            creditsPaid: totalCost,
          },
          actionUrl: `/project/${projectId}`,
        },
      });

      return NextResponse.json({
        success: true,
        status: 'approved',
        maxAttempts,
        creditsPaid: totalCost,
        creditsRemaining: spendResult.balance,
      });
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

// PATCH - Use attempt, select best, or final approve/reject
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, requestId } = await params;
    const body = await request.json();
    const { action, selectedUrl, note } = body;

    // Get the request with project info and characters for reference images
    const regenerationRequest = await prisma.regenerationRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: {
            name: true,
            settings: true,
            userId: true,
            characters: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!regenerationRequest) {
      return NextResponse.json({ error: 'Regeneration request not found' }, { status: 404 });
    }

    if (regenerationRequest.projectId !== projectId) {
      return NextResponse.json({ error: 'Request does not belong to this project' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Handle different actions
    switch (action) {
      case 'regenerate': {
        // Only requester can use their attempts
        if (regenerationRequest.requesterId !== session.user.id) {
          return NextResponse.json({ error: 'Only the requester can use regeneration attempts' }, { status: 403 });
        }

        // Check status is approved or generating
        if (!['approved', 'generating'].includes(regenerationRequest.status)) {
          return NextResponse.json({
            error: `Cannot regenerate in ${regenerationRequest.status} status. Request must be approved first.`
          }, { status: 400 });
        }

        // Check attempts remaining
        if (regenerationRequest.attemptsUsed >= regenerationRequest.maxAttempts) {
          return NextResponse.json({
            error: 'All regeneration attempts have been used. Please select the best option.'
          }, { status: 400 });
        }

        // Credits already prepaid by admin on approval - just verify they were paid
        if (regenerationRequest.creditsPaid <= 0) {
          return NextResponse.json({
            error: 'No credits allocated for this regeneration request'
          }, { status: 400 });
        }

        // Get resolution and aspect ratio from project settings for image generation
        const settings = regenerationRequest.project?.settings as {
          resolution?: string;
          aspectRatio?: string;
          imageResolution?: string;
        } | null;
        const resolution = settings?.imageResolution || settings?.resolution || '2k';
        const aspectRatio = settings?.aspectRatio || '16:9';

        // Build reference images array from project characters
        const referenceImages = (regenerationRequest.project?.characters || [])
          .filter((char: { name: string; imageUrl: string | null }) => char.imageUrl)
          .map((char: { name: string; imageUrl: string | null }) => ({
            name: char.name,
            imageUrl: char.imageUrl as string,
          }));

        console.log(`[Regeneration] Using ${referenceImages.length} character reference images, resolution: ${resolution}, aspectRatio: ${aspectRatio}`);

        // Set status to generating
        await prisma.regenerationRequest.update({
          where: { id: requestId },
          data: { status: 'generating' },
        });

        // Perform the regeneration
        let regenerationResult: { success: boolean; url?: string; error?: string };

        try {
          if (regenerationRequest.targetType === 'image') {
            // Call image generation API with reference images for character consistency
            // Use project owner's settings and track costs to owner
            const imageResponse = await fetch(new URL('/api/image', request.url).origin + '/api/image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || '',
              },
              body: JSON.stringify({
                prompt: scene.textToImagePrompt,
                aspectRatio,
                resolution,
                projectId,
                referenceImages, // IMPORTANT: Include character reference images!
                isRegeneration: true,
                sceneId: scene.id,
                skipCreditCheck: true, // Credits already prepaid by admin
                ownerId: regenerationRequest.project?.userId, // Use owner's settings and track costs to owner
              }),
            });

            const imageData = await imageResponse.json();

            if (imageResponse.ok && imageData.imageUrl) {
              regenerationResult = { success: true, url: imageData.imageUrl };
            } else {
              regenerationResult = { success: false, error: imageData.error || 'Image generation failed' };
            }
          } else {
            // Video regeneration
            if (!scene.imageUrl) {
              regenerationResult = { success: false, error: 'Scene has no image. Generate image first.' };
            } else {
              // Use project owner's settings and track costs to owner
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
                  skipCreditCheck: true,
                  ownerId: regenerationRequest.project?.userId, // Use owner's settings and track costs to owner
                }),
              });

              const videoData = await videoResponse.json();

              if (videoResponse.ok && videoData.videoUrl) {
                regenerationResult = { success: true, url: videoData.videoUrl };
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

        if (regenerationResult.success && regenerationResult.url) {
          // Credits already prepaid by admin on approval - no deduction needed here

          // Add URL to generatedUrls array
          const currentUrls = (regenerationRequest.generatedUrls as string[]) || [];
          const newUrls = [...currentUrls, regenerationResult.url];
          const newAttemptsUsed = regenerationRequest.attemptsUsed + 1;

          // Update request
          const newStatus = newAttemptsUsed >= regenerationRequest.maxAttempts ? 'selecting' : 'approved';
          await prisma.regenerationRequest.update({
            where: { id: requestId },
            data: {
              generatedUrls: newUrls,
              attemptsUsed: newAttemptsUsed,
              status: newStatus,
            },
          });

          // If all attempts used, notify collaborator to select
          if (newStatus === 'selecting') {
            await prisma.notification.create({
              data: {
                userId: regenerationRequest.requesterId,
                type: 'regeneration_completed',
                title: 'Regeneration Complete - Select Best Option',
                message: `All ${regenerationRequest.maxAttempts} regeneration attempts for "${scene.title}" are complete. Please select the best option.`,
                metadata: {
                  projectId,
                  projectName: regenerationRequest.project?.name,
                  requestId,
                  sceneId: scene.id,
                  generatedUrls: newUrls,
                },
                actionUrl: `/project/${projectId}`,
              },
            });
          }

          return NextResponse.json({
            success: true,
            url: regenerationResult.url,
            attemptsUsed: newAttemptsUsed,
            attemptsRemaining: regenerationRequest.maxAttempts - newAttemptsUsed,
            status: newStatus,
            generatedUrls: newUrls,
          });
        } else {
          // Regeneration failed, but don't count as attempt
          await prisma.regenerationRequest.update({
            where: { id: requestId },
            data: { status: 'approved' }, // Back to approved so they can try again
          });

          return NextResponse.json({
            success: false,
            error: regenerationResult.error,
          }, { status: 500 });
        }
      }

      case 'select': {
        // Only requester can select
        if (regenerationRequest.requesterId !== session.user.id) {
          return NextResponse.json({ error: 'Only the requester can select the best option' }, { status: 403 });
        }

        // Must be in selecting status (or approved if they want to pick early)
        if (!['selecting', 'approved', 'generating'].includes(regenerationRequest.status)) {
          return NextResponse.json({
            error: `Cannot select in ${regenerationRequest.status} status`
          }, { status: 400 });
        }

        // Validate selected URL is one of the generated ones
        const generatedUrls = (regenerationRequest.generatedUrls as string[]) || [];
        if (!selectedUrl || !generatedUrls.includes(selectedUrl)) {
          return NextResponse.json({
            error: 'Invalid selection. Please select one of the generated options.'
          }, { status: 400 });
        }

        // Update request with selection and set to awaiting final approval
        await prisma.regenerationRequest.update({
          where: { id: requestId },
          data: {
            selectedUrl,
            status: 'awaiting_final',
          },
        });

        // Notify admins for final approval
        const adminIds = await getProjectAdmins(projectId);
        const requesterName = regenerationRequest.requester?.name || regenerationRequest.requester?.email || 'A collaborator';

        for (const adminId of adminIds) {
          await prisma.notification.create({
            data: {
              userId: adminId,
              type: 'regeneration_request',
              title: 'Final Approval Required',
              message: `${requesterName} selected a regenerated ${regenerationRequest.targetType} for "${scene.title}". Please review and approve.`,
              metadata: {
                projectId,
                projectName: regenerationRequest.project?.name,
                requestId,
                sceneId: scene.id,
                selectedUrl,
                generatedUrls,
              },
              actionUrl: `/approvals`,
            },
          });
        }

        return NextResponse.json({
          success: true,
          status: 'awaiting_final',
          selectedUrl,
        });
      }

      case 'final_approve': {
        // Only admin can final approve
        const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
        if (!permissionCheck.allowed) {
          return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
        }

        if (regenerationRequest.status !== 'awaiting_final') {
          return NextResponse.json({
            error: `Cannot final approve in ${regenerationRequest.status} status`
          }, { status: 400 });
        }

        if (!regenerationRequest.selectedUrl) {
          return NextResponse.json({ error: 'No selection has been made' }, { status: 400 });
        }

        // Update the scene with the selected image/video
        const updateData = regenerationRequest.targetType === 'image'
          ? { imageUrl: regenerationRequest.selectedUrl }
          : { videoUrl: regenerationRequest.selectedUrl };

        await prisma.scene.update({
          where: { id: scene.id },
          data: updateData,
        });

        // Delete unused images from S3
        const generatedUrls = (regenerationRequest.generatedUrls as string[]) || [];
        const urlsToDelete = generatedUrls.filter(url => url !== regenerationRequest.selectedUrl);

        for (const url of urlsToDelete) {
          try {
            await deleteFromS3(url);
          } catch (err) {
            console.error('Failed to delete unused image from S3:', err);
          }
        }

        // Update request as completed
        await prisma.regenerationRequest.update({
          where: { id: requestId },
          data: {
            status: 'completed',
            finalReviewBy: session.user.id,
            finalReviewAt: new Date(),
            finalReviewNote: note,
            completedAt: new Date(),
          },
        });

        // Notify requester
        await prisma.notification.create({
          data: {
            userId: regenerationRequest.requesterId,
            type: 'request_approved',
            title: 'Regeneration Approved',
            message: `Your selected ${regenerationRequest.targetType} for "${scene.title}" has been approved and applied!`,
            metadata: {
              projectId,
              projectName: regenerationRequest.project?.name,
              requestId,
              sceneId: scene.id,
            },
            actionUrl: `/project/${projectId}`,
          },
        });

        return NextResponse.json({
          success: true,
          status: 'completed',
          appliedUrl: regenerationRequest.selectedUrl,
        });
      }

      case 'final_reject': {
        // Only admin can final reject
        const permissionCheck = await verifyPermission(session.user.id, projectId, 'canApproveRequests');
        if (!permissionCheck.allowed) {
          return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
        }

        if (regenerationRequest.status !== 'awaiting_final') {
          return NextResponse.json({
            error: `Cannot final reject in ${regenerationRequest.status} status`
          }, { status: 400 });
        }

        // Delete ALL generated images from S3
        const generatedUrls = (regenerationRequest.generatedUrls as string[]) || [];
        for (const url of generatedUrls) {
          try {
            await deleteFromS3(url);
          } catch (err) {
            console.error('Failed to delete image from S3:', err);
          }
        }

        // Update request as rejected
        await prisma.regenerationRequest.update({
          where: { id: requestId },
          data: {
            status: 'rejected',
            finalReviewBy: session.user.id,
            finalReviewAt: new Date(),
            finalReviewNote: note,
          },
        });

        // Notify requester
        await prisma.notification.create({
          data: {
            userId: regenerationRequest.requesterId,
            type: 'request_rejected',
            title: 'Regeneration Rejected',
            message: `Your regenerated ${regenerationRequest.targetType} for "${scene.title}" was rejected.${note ? ` Reason: ${note}` : ''}`,
            metadata: {
              projectId,
              projectName: regenerationRequest.project?.name,
              requestId,
              sceneId: scene.id,
              rejectionNote: note,
            },
            actionUrl: `/project/${projectId}`,
          },
        });

        return NextResponse.json({
          success: true,
          status: 'rejected',
        });
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: regenerate, select, final_approve, or final_reject'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('PATCH regeneration request error:', error);
    return NextResponse.json(
      { error: 'Failed to process regeneration request' },
      { status: 500 }
    );
  }
}
