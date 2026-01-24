/**
 * Credits Service - Manage user credits for AI generation
 *
 * This file now re-exports from the modular credits service directory
 * for backward compatibility. All implementations are in:
 * - credits/types.ts - Type definitions
 * - credits/constants.ts - Cost constants and helpers
 * - credits/operations.ts - Core credit operations
 * - credits/queries.ts - Query functions
 * - credits/statistics.ts - Statistics functions
 * - credits/multiplier.ts - User cost multiplier
 */

export * from './credits/index';
