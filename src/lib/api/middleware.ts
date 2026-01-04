/**
 * API Route Middleware
 *
 * Reduces repeated code across API routes:
 * - withAuth: Authentication wrapper (~400 lines saved across 55+ routes)
 * - requireCredits: Credit balance checking helper
 * - AuthenticatedRequest: Type-safe request with session
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkBalance } from '@/lib/services/credits';
import type { Session } from 'next-auth';

// Authenticated session type
export interface AuthenticatedSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// Context passed to authenticated handlers
export interface AuthContext {
  session: AuthenticatedSession;
  userId: string;
}

// Route handler type with auth context
export type AuthenticatedHandler<T = Record<string, string>> = (
  request: NextRequest,
  context: { params: Promise<T> },
  auth: AuthContext
) => Promise<NextResponse>;

// Simple handler without params
export type SimpleAuthHandler = (
  request: NextRequest,
  auth: AuthContext
) => Promise<NextResponse>;

/**
 * Wrap a route handler with authentication check
 *
 * @example
 * // With route params
 * export const GET = withAuth<{ id: string }>(async (request, { params }, { session, userId }) => {
 *   const { id } = await params;
 *   // userId is guaranteed to exist
 *   return NextResponse.json({ userId, id });
 * });
 *
 * @example
 * // Without route params
 * export const POST = withAuth(async (request, _, { userId }) => {
 *   const body = await request.json();
 *   return NextResponse.json({ userId });
 * });
 */
export function withAuth<T = Record<string, string>>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest, context: { params: Promise<T> }) => Promise<NextResponse> {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const authContext: AuthContext = {
      session: session as AuthenticatedSession,
      userId: session.user.id,
    };

    return handler(request, context, authContext);
  };
}

/**
 * Simple auth wrapper for routes without params
 *
 * @example
 * export const POST = withSimpleAuth(async (request, { userId }) => {
 *   const body = await request.json();
 *   return NextResponse.json({ success: true });
 * });
 */
export function withSimpleAuth(
  handler: SimpleAuthHandler
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const authContext: AuthContext = {
      session: session as AuthenticatedSession,
      userId: session.user.id,
    };

    return handler(request, authContext);
  };
}

/**
 * Check if user has sufficient credits, returns 402 response if not
 *
 * @example
 * const insufficientCredits = await requireCredits(userId, COSTS.VIDEO_GENERATION);
 * if (insufficientCredits) return insufficientCredits;
 * // Continue with generation...
 *
 * @example
 * // With skip option for prepaid regenerations
 * if (!skipCreditCheck) {
 *   const insufficientCredits = await requireCredits(userId, creditCost);
 *   if (insufficientCredits) return insufficientCredits;
 * }
 */
export async function requireCredits(
  userId: string,
  requiredCredits: number
): Promise<NextResponse | null> {
  const balanceCheck = await checkBalance(userId, requiredCredits);

  if (!balanceCheck.hasEnough) {
    return NextResponse.json({
      error: 'Insufficient credits',
      required: balanceCheck.required,
      balance: balanceCheck.balance,
      needsPurchase: true,
    }, { status: 402 });
  }

  return null; // Sufficient credits
}

/**
 * Check credits with custom error message
 */
export async function requireCreditsWithMessage(
  userId: string,
  requiredCredits: number,
  customMessage: string
): Promise<NextResponse | null> {
  const balanceCheck = await checkBalance(userId, requiredCredits);

  if (!balanceCheck.hasEnough) {
    return NextResponse.json({
      error: customMessage,
      required: balanceCheck.required,
      balance: balanceCheck.balance,
      needsPurchase: true,
    }, { status: 402 });
  }

  return null;
}

/**
 * Optional auth - returns session if authenticated, null otherwise
 * Useful for routes that work both authenticated and unauthenticated
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const authCtx = await optionalAuth();
 *   if (authCtx) {
 *     // User is logged in
 *     return NextResponse.json({ userId: authCtx.userId });
 *   }
 *   // Anonymous access
 *   return NextResponse.json({ guest: true });
 * }
 */
export async function optionalAuth(): Promise<AuthContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    session: session as AuthenticatedSession,
    userId: session.user.id,
  };
}

/**
 * Require auth and return context or throw response
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireAuth();
 *   if (authResult instanceof NextResponse) return authResult;
 *   const { userId, session } = authResult;
 *   // Continue with userId...
 * }
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return {
    session: session as AuthenticatedSession,
    userId: session.user.id,
  };
}

/**
 * Type guard to check if result is an error response
 */
export function isErrorResponse(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

// Re-export S3 helpers for convenience
export {
  isS3Configured,
  uploadImageToS3,
  uploadVideoToS3,
  uploadAudioToS3,
  uploadBase64ToS3,
  type UploadResult,
} from '@/lib/services/s3-upload';

/**
 * Upload media to S3 if configured, returns the URL (S3 or original)
 *
 * Simplifies the common pattern:
 * ```
 * if (isS3Configured() && url.startsWith('data:')) {
 *   const result = await uploadToS3(url, projectId);
 *   if (result.success && result.url) url = result.url;
 * }
 * ```
 *
 * @example
 * const imageUrl = await uploadMediaToS3(base64Data, 'image', projectId);
 * // Returns S3 URL if configured, otherwise returns original base64
 *
 * @example
 * // With options
 * const { url, storage } = await uploadMediaToS3WithInfo(base64Data, 'video', projectId);
 * // storage: 's3' | 'base64'
 */
import {
  isS3Configured as checkS3Configured,
  uploadImageToS3 as s3Image,
  uploadVideoToS3 as s3Video,
  uploadAudioToS3 as s3Audio,
} from '@/lib/services/s3-upload';

export type MediaType = 'image' | 'video' | 'audio';

export async function uploadMediaToS3(
  dataUrl: string,
  mediaType: MediaType,
  projectId?: string
): Promise<string> {
  // Skip if not base64 or S3 not configured
  if (!dataUrl.startsWith('data:') || !checkS3Configured()) {
    return dataUrl;
  }

  const uploadFn = {
    image: s3Image,
    video: s3Video,
    audio: s3Audio,
  }[mediaType];

  try {
    const result = await uploadFn(dataUrl, projectId);
    if (result.success && result.url) {
      return result.url;
    }
  } catch (error) {
    console.error(`[S3] Failed to upload ${mediaType}:`, error);
  }

  // Return original on failure
  return dataUrl;
}

export interface MediaUploadResult {
  url: string;
  storage: 's3' | 'base64' | 'url';
}

/**
 * Upload media to S3 with storage info
 */
export async function uploadMediaToS3WithInfo(
  dataUrl: string,
  mediaType: MediaType,
  projectId?: string
): Promise<MediaUploadResult> {
  // Already a URL (not base64)
  if (!dataUrl.startsWith('data:')) {
    return { url: dataUrl, storage: 'url' };
  }

  // S3 not configured
  if (!checkS3Configured()) {
    return { url: dataUrl, storage: 'base64' };
  }

  const uploadFn = {
    image: s3Image,
    video: s3Video,
    audio: s3Audio,
  }[mediaType];

  try {
    const result = await uploadFn(dataUrl, projectId);
    if (result.success && result.url) {
      return { url: result.url, storage: 's3' };
    }
  } catch (error) {
    console.error(`[S3] Failed to upload ${mediaType}:`, error);
  }

  // Return original on failure
  return { url: dataUrl, storage: 'base64' };
}
