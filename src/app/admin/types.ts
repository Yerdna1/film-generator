export interface UserCredits {
  balance: number;
  totalSpent: number;
  totalEarned: number;
  totalRealCost: number;
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isBlocked: boolean;
  isApproved: boolean;
  costMultiplier: number;
  createdAt: string;
  credits: UserCredits;
  projectCount: number;
  membershipCount: number;
}

export interface AppConfig {
  startingCredits: number;
}

export type CreditAction = 'add' | 'deduct' | 'set';
