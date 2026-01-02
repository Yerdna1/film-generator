import { prisma } from '../setup'

// Regeneration Request Factory
interface CreateRegenRequestOptions {
  targetType?: 'image' | 'video'
  targetId?: string
  targetName?: string
  status?: 'pending' | 'approved' | 'generating' | 'selecting' | 'awaiting_final' | 'completed' | 'rejected' | 'failed'
  maxAttempts?: number
  attemptsUsed?: number
  creditsPaid?: number
  generatedUrls?: string[]
  selectedUrl?: string
  reviewedBy?: string
  finalReviewBy?: string
}

export async function createRegenerationRequest(
  projectId: string,
  requesterId: string,
  options: CreateRegenRequestOptions = {}
) {
  return prisma.regenerationRequest.create({
    data: {
      projectId,
      requesterId,
      targetType: options.targetType || 'image',
      targetId: options.targetId || 'scene-id-placeholder',
      targetName: options.targetName || 'Test Scene',
      status: options.status || 'pending',
      maxAttempts: options.maxAttempts ?? 3,
      attemptsUsed: options.attemptsUsed ?? 0,
      creditsPaid: options.creditsPaid ?? 0,
      generatedUrls: options.generatedUrls || [],
      selectedUrl: options.selectedUrl,
      reviewedBy: options.reviewedBy,
      finalReviewBy: options.finalReviewBy,
      logs: []
    }
  })
}

export async function createApprovedRegenRequest(
  projectId: string,
  requesterId: string,
  reviewerId: string,
  creditsPaid: number,
  options: CreateRegenRequestOptions = {}
) {
  return createRegenerationRequest(projectId, requesterId, {
    ...options,
    status: 'approved',
    reviewedBy: reviewerId,
    creditsPaid
  })
}

// Deletion Request Factory
interface CreateDeletionRequestOptions {
  targetType?: 'project' | 'scene' | 'character' | 'video'
  targetId?: string
  status?: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewNote?: string
}

export async function createDeletionRequest(
  projectId: string,
  requesterId: string,
  options: CreateDeletionRequestOptions = {}
) {
  return prisma.deletionRequest.create({
    data: {
      projectId,
      requesterId,
      targetType: options.targetType || 'scene',
      targetId: options.targetId || 'target-id-placeholder',
      status: options.status || 'pending',
      reviewedBy: options.reviewedBy,
      reviewNote: options.reviewNote
    }
  })
}

// Prompt Edit Request Factory
interface CreatePromptEditOptions {
  sceneId?: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  status?: 'pending' | 'approved' | 'rejected' | 'reverted'
  reviewedBy?: string
}

export async function createPromptEditRequest(
  projectId: string,
  requesterId: string,
  options: CreatePromptEditOptions = {}
) {
  return prisma.promptEditRequest.create({
    data: {
      projectId,
      requesterId,
      sceneId: options.sceneId || 'scene-id-placeholder',
      fieldName: options.fieldName || 'textToImagePrompt',
      oldValue: options.oldValue || 'Old prompt value',
      newValue: options.newValue || 'New prompt value',
      status: options.status || 'pending',
      reviewedBy: options.reviewedBy
    }
  })
}

// Notification Factory
interface CreateNotificationOptions {
  type?: string
  title?: string
  message?: string
  read?: boolean
  actionUrl?: string
}

export async function createNotification(
  userId: string,
  options: CreateNotificationOptions = {}
) {
  return prisma.notification.create({
    data: {
      userId,
      type: options.type || 'info',
      title: options.title || 'Test Notification',
      message: options.message || 'This is a test notification',
      read: options.read ?? false,
      actionUrl: options.actionUrl
    }
  })
}
