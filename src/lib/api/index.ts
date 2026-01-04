/**
 * API Utilities
 *
 * Shared middleware and helpers for API routes.
 *
 * @example
 * // Authentication wrapper
 * import { withAuth, requireCredits } from '@/lib/api';
 *
 * export const POST = withAuth(async (request, _, { userId }) => {
 *   const insufficientCredits = await requireCredits(userId, COSTS.IMAGE);
 *   if (insufficientCredits) return insufficientCredits;
 *   // Continue...
 * });
 *
 * @example
 * // S3 upload helper
 * import { uploadMediaToS3 } from '@/lib/api';
 *
 * const imageUrl = await uploadMediaToS3(base64Data, 'image', projectId);
 */

export {
  // Auth wrappers
  withAuth,
  withSimpleAuth,
  requireAuth,
  optionalAuth,
  isErrorResponse,
  type AuthContext,
  type AuthenticatedSession,
  type AuthenticatedHandler,
  type SimpleAuthHandler,

  // Credit helpers
  requireCredits,
  requireCreditsWithMessage,

  // S3 upload helpers
  uploadMediaToS3,
  uploadMediaToS3WithInfo,
  type MediaType,
  type MediaUploadResult,

  // Re-exported S3 utilities
  isS3Configured,
  uploadImageToS3,
  uploadVideoToS3,
  uploadAudioToS3,
  uploadBase64ToS3,
  type UploadResult,
} from './middleware';
