// Admin verification utilities
// Uses database role field instead of hardcoded email

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

// Legacy admin email - kept for backwards compatibility during migration
// TODO: Remove after all admin users are migrated to role-based system
export const LEGACY_ADMIN_EMAIL = 'andrej.galad@gmail.com';

export interface AdminCheckResult {
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Check if the current session user is an admin
 * Uses database role field for verification
 *
 * @returns AdminCheckResult with isAdmin status and userId
 */
export async function verifyAdmin(): Promise<AdminCheckResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Not authenticated',
      };
    }

    // Fetch user from database to check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return {
        isAdmin: false,
        userId: session.user.id,
        error: 'User not found',
      };
    }

    // Check if user has admin role in database
    const isAdmin = user.role === 'admin';

    return {
      isAdmin,
      userId: user.id,
      error: isAdmin ? undefined : 'Insufficient permissions',
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return {
      isAdmin: false,
      userId: null,
      error: 'Verification failed',
    };
  }
}

/**
 * Get all admin users from the database
 * Useful for notifications and audit logs
 */
export async function getAdminUsers(): Promise<{ id: string; email: string | null; name: string | null }[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, email: true, name: true },
  });
  return admins;
}

/**
 * Check if a specific user ID is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'admin';
}
