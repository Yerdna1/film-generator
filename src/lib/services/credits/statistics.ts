/**
 * Statistics functions for credits and transactions
 */

import { prisma } from '@/lib/db/prisma';
import type { CreditsInfo, TransactionRecord } from './types';
import { getOrCreateCredits } from './operations';

/**
 * Get user statistics with real costs and generation/regeneration breakdown
 * Optimized: Single query for credits+transactions, batched project query
 */
export async function getUserStatistics(userId: string): Promise<{
  credits: CreditsInfo;
  stats: {
    totalTransactions: number;
    totalGenerations: number;
    totalRegenerations: number;
    byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }>;
    byProvider: Record<string, { count: number; credits: number; realCost: number }>;
    byProject: Record<string, { name: string; credits: number; realCost: number }>;
  };
  recentTransactions: TransactionRecord[];
}> {
  // Single query for credits and recent transactions (limit to reduce network transfer)
  const creditsRecord = await prisma.credits.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 200, // Limit to reduce DB traffic - enough for stats + 50 recent
      },
    },
  });

  // If no credits record, create one and return empty stats
  if (!creditsRecord) {
    const credits = await getOrCreateCredits(userId);
    return {
      credits,
      stats: {
        totalTransactions: 0,
        totalGenerations: 0,
        totalRegenerations: 0,
        byType: {},
        byProvider: {},
        byProject: {},
      },
      recentTransactions: [],
    };
  }

  const credits: CreditsInfo = {
    balance: creditsRecord.balance,
    totalSpent: creditsRecord.totalSpent,
    totalEarned: creditsRecord.totalEarned,
    totalRealCost: creditsRecord.totalRealCost,
    lastUpdated: creditsRecord.lastUpdated,
  };

  const transactions = creditsRecord.transactions;

  // First pass: calculate stats and collect project IDs
  const byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }> = {};
  const byProvider: Record<string, { count: number; credits: number; realCost: number }> = {};
  const projectIds = new Set<string>();
  const projectCredits: Record<string, { credits: number; realCost: number }> = {};

  let totalGenerations = 0;
  let totalRegenerations = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      const metadata = tx.metadata as { isRegeneration?: boolean } | null;
      const isRegeneration = metadata?.isRegeneration ?? false;

      if (isRegeneration) {
        totalRegenerations++;
      } else {
        totalGenerations++;
      }

      // By type
      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, credits: 0, realCost: 0, generations: 0, regenerations: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].credits += Math.abs(tx.amount);
      byType[tx.type].realCost += tx.realCost;
      if (isRegeneration) {
        byType[tx.type].regenerations++;
      } else {
        byType[tx.type].generations++;
      }

      // By provider
      const provider = tx.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, credits: 0, realCost: 0 };
      }
      byProvider[provider].count++;
      byProvider[provider].credits += Math.abs(tx.amount);
      byProvider[provider].realCost += tx.realCost;

      // Collect project costs (will add names after batch query)
      if (tx.projectId) {
        projectIds.add(tx.projectId);
        if (!projectCredits[tx.projectId]) {
          projectCredits[tx.projectId] = { credits: 0, realCost: 0 };
        }
        projectCredits[tx.projectId].credits += Math.abs(tx.amount);
        projectCredits[tx.projectId].realCost += tx.realCost;
      }
    }
  }

  // Single batched query for all project names (avoids N+1)
  const byProject: Record<string, { name: string; credits: number; realCost: number }> = {};
  if (projectIds.size > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: Array.from(projectIds) } },
      select: { id: true, name: true },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    for (const [projectId, costs] of Object.entries(projectCredits)) {
      byProject[projectId] = {
        name: projectMap.get(projectId) || 'Unknown Project',
        ...costs,
      };
    }
  }

  return {
    credits,
    stats: {
      totalTransactions: transactions.filter((t) => t.amount < 0).length,
      totalGenerations,
      totalRegenerations,
      byType,
      byProvider,
      byProject,
    },
    recentTransactions: transactions.slice(0, 50).map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      realCost: tx.realCost,
      type: tx.type,
      provider: tx.provider,
      description: tx.description,
      projectId: tx.projectId,
      createdAt: tx.createdAt,
    })),
  };
}

/**
 * Get project-specific statistics with generation/regeneration breakdown
 */
export async function getProjectStatistics(projectId: string): Promise<{
  totalCredits: number;
  totalRealCost: number;
  byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }>;
  byProvider: Record<string, { count: number; credits: number; realCost: number }>;
  transactions: TransactionRecord[];
  summary: {
    totalGenerations: number;
    totalRegenerations: number;
    imageGenerations: number;
    imageRegenerations: number;
    videoGenerations: number;
    videoRegenerations: number;
  };
}> {
  const transactions = await prisma.creditTransaction.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  let totalCredits = 0;
  let totalRealCost = 0;
  const byType: Record<string, { count: number; credits: number; realCost: number; generations: number; regenerations: number }> = {};
  const byProvider: Record<string, { count: number; credits: number; realCost: number }> = {};

  // Summary counts
  let totalGenerations = 0;
  let totalRegenerations = 0;
  let imageGenerations = 0;
  let imageRegenerations = 0;
  let videoGenerations = 0;
  let videoRegenerations = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      totalCredits += Math.abs(tx.amount);
      totalRealCost += tx.realCost;

      // Check metadata for isRegeneration flag
      const metadata = tx.metadata as { isRegeneration?: boolean } | null;
      const isRegeneration = metadata?.isRegeneration ?? false;

      // By type with generation/regeneration breakdown
      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, credits: 0, realCost: 0, generations: 0, regenerations: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].credits += Math.abs(tx.amount);
      byType[tx.type].realCost += tx.realCost;

      if (isRegeneration) {
        byType[tx.type].regenerations++;
        totalRegenerations++;
        if (tx.type === 'image') imageRegenerations++;
        if (tx.type === 'video') videoRegenerations++;
      } else {
        byType[tx.type].generations++;
        totalGenerations++;
        if (tx.type === 'image') imageGenerations++;
        if (tx.type === 'video') videoGenerations++;
      }

      // By provider
      const provider = tx.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, credits: 0, realCost: 0 };
      }
      byProvider[provider].count++;
      byProvider[provider].credits += Math.abs(tx.amount);
      byProvider[provider].realCost += tx.realCost;
    }
  }

  return {
    totalCredits,
    totalRealCost,
    byType,
    byProvider,
    transactions: transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      realCost: tx.realCost,
      type: tx.type,
      provider: tx.provider,
      description: tx.description,
      projectId: tx.projectId,
      createdAt: tx.createdAt,
    })),
    summary: {
      totalGenerations,
      totalRegenerations,
      imageGenerations,
      imageRegenerations,
      videoGenerations,
      videoRegenerations,
    },
  };
}
