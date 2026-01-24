/**
 * Type definitions for the credits service
 */

import type { Provider } from '../real-costs';
import { COSTS } from './constants';

export interface CreditsInfo {
  balance: number;
  totalSpent: number;
  totalEarned: number;
  totalRealCost: number;
  lastUpdated: Date;
}

export interface TransactionRecord {
  id: string;
  amount: number;
  realCost: number;
  type: string;
  provider: string | null;
  description: string | null;
  projectId: string | null;
  createdAt: Date;
}

export type CostType = keyof typeof COSTS;

export type { Provider };
