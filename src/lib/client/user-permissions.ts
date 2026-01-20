/**
 * Client-side helper functions for user permissions
 * These functions call the API endpoints instead of using Prisma directly
 */

import type { UserPermissions, OperationType, PaymentMethod } from '@/lib/services/user-permissions';

/**
 * Get user permissions from API
 */
export async function getUserPermissions(): Promise<UserPermissions> {
  const response = await fetch('/api/user/permissions');
  if (!response.ok) {
    throw new Error('Failed to fetch user permissions');
  }
  const { permissions } = await response.json();
  return permissions;
}

/**
 * Get available payment methods from API
 */
export async function getAvailablePaymentMethods(operation?: OperationType): Promise<PaymentMethod[]> {
  const params = new URLSearchParams({
    includePaymentMethods: 'true',
    ...(operation && { operation })
  });

  const response = await fetch(`/api/user/permissions?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch payment methods');
  }
  const { paymentMethods } = await response.json();
  return paymentMethods || [];
}

/**
 * Check if user has required API keys (via API)
 */
export async function checkRequiredApiKeys(operation: OperationType): Promise<{
  hasKeys: boolean;
  missing: string[];
  provider?: string;
}> {
  const response = await fetch(`/api/user/api-keys/check?operation=${operation}`);
  if (!response.ok) {
    throw new Error('Failed to check API keys');
  }
  return response.json();
}

/**
 * Check if user should use their own API keys (via API)
 */
export async function shouldUseOwnApiKeys(operation: OperationType): Promise<boolean> {
  const permissions = await getUserPermissions();

  // Free users always use own keys if available
  if (permissions.userType === 'free') {
    const keyCheck = await checkRequiredApiKeys(operation);
    return keyCheck.hasKeys;
  }

  // Premium/admin users check preference
  return permissions.preferOwnKeys;
}