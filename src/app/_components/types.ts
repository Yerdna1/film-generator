export interface CreditsData {
  credits: {
    balance: number;
    totalSpent: number;
    totalEarned: number;
  };
  transactions?: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
  }>;
}

export interface ProjectCostsData {
  costs: Record<string, { credits: number; realCost: number }>;
  multiplier: number;
  isAdmin: boolean;
}

export interface CreditsBreakdown {
  images: number;
  videos: number;
  voiceovers: number;
  scenes: number;
  other: number;
}

export interface ProjectStats {
  total: number;
  inProgress: number;
  completed: number;
  totalScenes: number;
}
