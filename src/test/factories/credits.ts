import { prisma } from '../setup'

interface CreateCreditsOptions {
  balance?: number
  totalSpent?: number
  totalEarned?: number
  totalRealCost?: number
}

export async function createTestCredits(userId: string, options: CreateCreditsOptions = {}) {
  const balance = options.balance ?? 1000

  return prisma.credits.create({
    data: {
      userId,
      balance,
      totalSpent: options.totalSpent ?? 0,
      totalEarned: options.totalEarned ?? balance,
      totalRealCost: options.totalRealCost ?? 0
    }
  })
}

export async function createCreditsWithHistory(
  userId: string,
  balance: number,
  transactions: Array<{
    amount: number
    realCost: number
    type: string
    provider?: string
    projectId?: string
    isRegeneration?: boolean
  }>
) {
  const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalRealCost = transactions.reduce((sum, t) => sum + t.realCost, 0)

  const credits = await prisma.credits.create({
    data: {
      userId,
      balance,
      totalSpent,
      totalEarned: balance + totalSpent,
      totalRealCost
    }
  })

  // Create transaction history
  for (const tx of transactions) {
    await prisma.creditTransaction.create({
      data: {
        creditsId: credits.id,
        amount: -Math.abs(tx.amount), // Spending is negative
        realCost: tx.realCost,
        type: tx.type,
        provider: tx.provider,
        projectId: tx.projectId,
        metadata: tx.isRegeneration ? { isRegeneration: true } : {}
      }
    })
  }

  return credits
}

export async function addCreditsTransaction(
  creditsId: string,
  amount: number,
  type: string,
  options: {
    realCost?: number
    provider?: string
    projectId?: string
    isRegeneration?: boolean
  } = {}
) {
  return prisma.creditTransaction.create({
    data: {
      creditsId,
      amount,
      realCost: options.realCost ?? 0,
      type,
      provider: options.provider,
      projectId: options.projectId,
      metadata: options.isRegeneration ? { isRegeneration: true } : {}
    }
  })
}
