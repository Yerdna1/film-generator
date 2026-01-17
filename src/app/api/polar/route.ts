// Polar.sh API Route - Checkout and Customer Portal
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createCheckout,
  getCustomerPortal,
  getSubscription,
  SUBSCRIPTION_PLANS,
  type PlanType,
} from '@/lib/services/polar';
import { getStartingCredits } from '@/lib/services/app-config';

// GET - Get current subscription status (or just plans for non-authenticated users)
export async function GET() {
  try {
    const session = await auth();

    // Fetch admin-configured starting credits
    const startingCredits = await getStartingCredits();

    // Create dynamic plans with admin-configured free credits
    const dynamicPlans = {
      ...SUBSCRIPTION_PLANS,
      free: {
        ...SUBSCRIPTION_PLANS.free,
        credits: startingCredits,
        features: [
          `${startingCredits} credits on signup`,
          'Basic features',
          'Community support',
        ],
      },
    };

    // If not authenticated, just return plans (for pricing page visibility)
    if (!session?.user?.id) {
      return NextResponse.json({
        subscription: null,
        plans: dynamicPlans,
      });
    }

    const subscription = await getSubscription(session.user.id);

    return NextResponse.json({
      subscription,
      plans: dynamicPlans,
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

// POST - Create checkout session or get portal URL
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, plan } = await request.json();

    if (action === 'checkout') {
      // Validate plan
      if (!plan || !['starter', 'pro', 'studio'].includes(plan)) {
        return NextResponse.json(
          { error: 'Invalid plan' },
          { status: 400 }
        );
      }

      const result = await createCheckout(
        session.user.id,
        session.user.email,
        plan as PlanType
      );

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ checkoutUrl: result.url });
    }

    if (action === 'portal') {
      const result = await getCustomerPortal(session.user.id);

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ portalUrl: result.url });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Polar route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
