// Polar.sh Payment Integration Service
// Documentation: https://docs.polar.sh

import { Polar } from '@polar-sh/sdk';
import { prisma } from '@/lib/db/prisma';
import { addCredits } from './credits';

// Initialize Polar client
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
});

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    credits: 0, // Dynamically set from AppConfig.startingCredits in /api/polar
    description: 'Try out the app',
    features: ['Credits on signup', 'Basic features', 'Community support'], // Credits count set dynamically
  },
  starter: {
    name: 'Starter',
    price: 9,
    credits: 500,
    description: 'For hobbyists',
    productId: process.env.POLAR_PRODUCT_STARTER,
    features: ['500 credits/month', 'All AI models', 'Email support'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    credits: 2000,
    description: 'For regular users',
    productId: process.env.POLAR_PRODUCT_PRO,
    features: ['2,000 credits/month', 'Priority generation', 'Priority support'],
  },
  studio: {
    name: 'Studio',
    price: 79,
    credits: 6000,
    description: 'For creators',
    productId: process.env.POLAR_PRODUCT_STUDIO,
    features: ['6,000 credits/month', 'Highest priority', 'Dedicated support'],
  },
} as const;

export type PlanType = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Create a checkout session for a subscription plan
 */
export async function createCheckout(
  userId: string,
  userEmail: string,
  plan: PlanType
): Promise<{ url: string } | { error: string }> {
  try {
    if (plan === 'free') {
      return { error: 'Cannot checkout for free plan' };
    }

    const planConfig = SUBSCRIPTION_PLANS[plan];
    if (!planConfig.productId) {
      return { error: `Product ID not configured for ${plan} plan` };
    }

    // Get or create subscription record
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          status: 'free',
          plan: 'free',
        },
      });
    }

    // Create checkout session via Polar
    const checkout = await polar.checkouts.create({
      products: [planConfig.productId],
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      customerEmail: userEmail,
      metadata: {
        userId,
        plan,
      },
    });

    return { url: checkout.url };
  } catch (error) {
    console.error('Error creating checkout:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create checkout' };
  }
}

/**
 * Get customer portal URL for managing subscription
 */
export async function getCustomerPortal(
  userId: string
): Promise<{ url: string } | { error: string }> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.polarCustomerId) {
      return { error: 'No subscription found' };
    }

    const session = await polar.customerSessions.create({
      customerId: subscription.polarCustomerId,
    });

    return { url: session.customerPortalUrl };
  } catch (error) {
    console.error('Error getting customer portal:', error);
    return { error: error instanceof Error ? error.message : 'Failed to get portal URL' };
  }
}

/**
 * Get user's current subscription
 */
export async function getSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      status: 'free',
      plan: 'free' as PlanType,
      planDetails: SUBSCRIPTION_PLANS.free,
    };
  }

  return {
    status: subscription.status,
    plan: subscription.plan as PlanType,
    planDetails: SUBSCRIPTION_PLANS[subscription.plan as PlanType] || SUBSCRIPTION_PLANS.free,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}

/**
 * Handle subscription activation (called from webhook)
 */
export async function activateSubscription(
  userId: string,
  polarCustomerId: string,
  polarSubscriptionId: string,
  plan: PlanType,
  currentPeriodEnd: Date
): Promise<void> {
  // Update subscription record
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: 'active',
      plan,
      polarCustomerId,
      polarSubscriptionId,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    },
    create: {
      userId,
      status: 'active',
      plan,
      polarCustomerId,
      polarSubscriptionId,
      currentPeriodEnd,
    },
  });

  // Add credits for the plan
  const planConfig = SUBSCRIPTION_PLANS[plan];
  if (planConfig && planConfig.credits > 0) {
    await addCredits(
      userId,
      planConfig.credits,
      'subscription',
      `${planConfig.name} plan activation`
    );
  }
}

/**
 * Handle subscription renewal (called from webhook)
 */
export async function renewSubscription(
  userId: string,
  currentPeriodEnd: Date
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) return;

  // Update period end
  await prisma.subscription.update({
    where: { userId },
    data: { currentPeriodEnd },
  });

  // Add monthly credits
  const planConfig = SUBSCRIPTION_PLANS[subscription.plan as PlanType];
  if (planConfig && planConfig.credits > 0) {
    await addCredits(
      userId,
      planConfig.credits,
      'subscription_renewal',
      `${planConfig.name} plan renewal`
    );
  }
}

/**
 * Handle subscription cancellation (called from webhook)
 */
export async function cancelSubscription(
  userId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: cancelAtPeriodEnd ? 'active' : 'canceled',
      cancelAtPeriodEnd,
    },
  });
}

/**
 * Handle subscription ended (period expired after cancellation)
 */
export async function endSubscription(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'free',
      plan: 'free',
      polarSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });
}

/**
 * Verify Polar webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    console.error('POLAR_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
