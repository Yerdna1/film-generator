/**
 * Permission and credit checking utilities for LLM routes
 */

import {
  getUserPermissions,
  shouldUseOwnApiKeys,
  checkRequiredApiKeys,
  getMissingRequirementError
} from '@/lib/services/user-permissions';
import { checkBalance, COSTS } from '@/lib/services/credits';

const PROMPT_ENHANCEMENT_COST = COSTS.SCENE_GENERATION;

interface PermissionCheckOptions {
  userId: string;
  isUsingOwnKey: boolean;
  isFreeModel: boolean;
}

interface PermissionCheckResult {
  allowed: boolean;
  error?: {
    message: string;
    code: string;
    status: number;
    creditsRequired?: number;
    balance?: number;
    showCreditsModal?: boolean;
    type?: string;
  };
}

/**
 * Check if user has permission to use the LLM service
 */
export async function checkLLMPermissions(
  options: PermissionCheckOptions
): Promise<PermissionCheckResult> {
  const { userId, isUsingOwnKey, isFreeModel } = options;

  const permissions = await getUserPermissions(userId);
  const useOwnKeys = await shouldUseOwnApiKeys(userId, 'llm');

  // Check if user needs API keys
  if ((useOwnKeys || permissions.requiresApiKeys) && !isUsingOwnKey && !isFreeModel) {
    const keyCheck = await checkRequiredApiKeys(userId, 'llm');

    if (!keyCheck.hasKeys) {
      const missingError = getMissingRequirementError(permissions, 'llm', keyCheck.missing);
      return {
        allowed: false,
        error: {
          message: missingError.error,
          code: missingError.code,
          status: missingError.code === 'API_KEY_REQUIRED' ? 403 : 402,
          creditsRequired: PROMPT_ENHANCEMENT_COST,
          balance: 0,
          type: 'llm'
        }
      };
    }
  } else if (permissions.requiresCredits && !isUsingOwnKey && !isFreeModel) {
    // Premium/admin user using system keys - check credits
    const balanceCheck = await checkBalance(userId, PROMPT_ENHANCEMENT_COST);
    if (!balanceCheck.hasEnough) {
      return {
        allowed: false,
        error: {
          message: `Insufficient credits. Need ${PROMPT_ENHANCEMENT_COST}, have ${balanceCheck.balance}`,
          code: 'INSUFFICIENT_CREDITS',
          status: 402,
          creditsRequired: PROMPT_ENHANCEMENT_COST,
          balance: balanceCheck.balance,
          showCreditsModal: true
        }
      };
    }
  }

  return { allowed: true };
}