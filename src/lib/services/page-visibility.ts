// Page visibility helper functions

import { prisma } from '@/lib/db/prisma';
import type { User, ApiKeys } from '@prisma/client';

export interface PageVisibilityCheckOptions {
  path: string;
  user?: User | null;
  apiKeys?: ApiKeys | null;
}

export interface PageVisibilityResult {
  visible: boolean;
  reason?: string;
  rule?: {
    path: string;
    hideIfUserOwnsApiKey: boolean;
    allowedRoles: string | string[];
  };
}

/**
 * Check if a page is visible to a user based on:
 * - User role
 * - Subscription status
 * - Whether user has their own API keys configured
 */
export async function checkPageVisibility(options: PageVisibilityCheckOptions): Promise<PageVisibilityResult> {
  const { path, user, apiKeys } = options;

  // Fetch enabled visibility rules, ordered by priority (highest first)
  const rules = await prisma.pageVisibility.findMany({
    where: {
      isEnabled: true,
    },
    orderBy: {
      priority: 'desc',
    },
  });

  // Find matching rule for this path
  const matchingRule = rules.find((rule: typeof rules[0]) => {
    // Exact path match
    if (rule.path === path) return true;

    // Wildcard match (e.g., /admin/*)
    if (rule.path.endsWith('/*')) {
      const prefix = rule.path.slice(0, -2);
      return path.startsWith(prefix);
    }

    return false;
  });

  // If no rule found, page is visible by default
  if (!matchingRule) {
    return { visible: true };
  }

  // Check if user has their own API keys configured
  const userHasOwnApiKeys = apiKeys && hasAnyApiKey(apiKeys);

  // Check hideIfUserOwnsApiKey rule
  if (matchingRule.hideIfUserOwnsApiKey && userHasOwnApiKeys) {
    return {
      visible: false,
      reason: 'Page is hidden for users with their own API keys',
      rule: {
        path: matchingRule.path,
        hideIfUserOwnsApiKey: matchingRule.hideIfUserOwnsApiKey,
        allowedRoles: matchingRule.allowedRoles as string | string[],
      },
    };
  }

  // Check role-based access AND subscription status-based access
  // User passes if EITHER role matches OR subscription status matches (OR logic, not AND)
  let hasRoleAccess = true;
  let hasSubscriptionAccess = true;

  // Check role-based access
  const allowedRoles = matchingRule.allowedRoles as string | string[];
  if (user && allowedRoles !== '*') {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    hasRoleAccess = roles.includes(user.role);
  }

  // Check subscription status-based access
  if (matchingRule.allowedSubscriptionStatus && matchingRule.allowedSubscriptionStatus !== null && user) {
    // Get user's subscription status
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    const userSubscriptionStatus = subscription?.status || 'free';
    const allowedStatuses = matchingRule.allowedSubscriptionStatus as string[];
    hasSubscriptionAccess = allowedStatuses.includes(userSubscriptionStatus);
  }

  // User must pass AT LEAST ONE check (OR logic)
  if (!hasRoleAccess && !hasSubscriptionAccess) {
    const reasons = [];
    if (!hasRoleAccess) {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      reasons.push(`role: ${roles.join(', ')}`);
    }
    if (!hasSubscriptionAccess) {
      const allowedStatuses = matchingRule.allowedSubscriptionStatus as string[];
      reasons.push(`subscription: ${allowedStatuses.join(', ')}`);
    }
    return {
      visible: false,
      reason: `Page requires one of: ${reasons.join(' OR ')}`,
      rule: {
        path: matchingRule.path,
        hideIfUserOwnsApiKey: matchingRule.hideIfUserOwnsApiKey,
        allowedRoles: matchingRule.allowedRoles as string | string[],
      },
    };
  }

  // Page is visible
  return {
    visible: true,
    rule: {
      path: matchingRule.path,
      hideIfUserOwnsApiKey: matchingRule.hideIfUserOwnsApiKey,
      allowedRoles: matchingRule.allowedRoles as string | string[],
    },
  };
}

/**
 * Check if a user has any API key configured
 */
function hasAnyApiKey(apiKeys: ApiKeys): boolean {
  // Check for common API key fields
  const keyFields = [
    'geminiApiKey',
    'grokApiKey',
    'claudeApiKey',
    'openaiApiKey',
    'elevenLabsApiKey',
    'nanoBananaApiKey',
    'modalApiKey',
    'sunoApiKey',
    'polarApiKey',
    'kieApiKey',
  ] as const;

  return keyFields.some((field) => {
    const value = apiKeys[field as keyof ApiKeys];
    return (
      value &&
      typeof value === 'string' &&
      value.length > 0 &&
      value !== '' &&
      value !== 'your-api-key-here' &&
      !value.startsWith('your-')
    );
  });
}

/**
 * Get all page visibility rules for a user
 * Returns which pages are visible/hidden and why
 */
export async function getUserPageVisibility(userId: string): Promise<{
  path: string;
  name: string;
  visible: boolean;
  reason?: string;
}[]> {
  // Get all enabled rules
  const rules = await prisma.pageVisibility.findMany({
    where: {
      isEnabled: true,
    },
    orderBy: {
      priority: 'desc',
    },
  });

  // Get user and API keys
  const [user, apiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.apiKeys.findUnique({
      where: { userId },
    }),
  ]);

  // Check visibility for each rule
  const results = await Promise.all(
    rules.map(async (rule: typeof rules[0]) => {
      const result = await checkPageVisibility({
        path: rule.path,
        user,
        apiKeys,
      });

      return {
        path: rule.path,
        name: rule.name,
        visible: result.visible,
        reason: result.reason,
      };
    })
  );

  return results;
}
