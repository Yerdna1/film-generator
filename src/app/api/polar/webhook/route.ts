// Polar.sh Webhook Handler
// Handles subscription lifecycle events
import { NextRequest, NextResponse } from 'next/server';
import {
  activateSubscription,
  renewSubscription,
  cancelSubscription,
  endSubscription,
  verifyWebhookSignature,
  type PlanType,
} from '@/lib/services/polar';

// Disable body parsing - we need the raw body for signature verification
export const dynamic = 'force-dynamic';

interface PolarWebhookEvent {
  type: string;
  data: {
    id: string;
    customer_id: string;
    product_id: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    metadata?: {
      userId?: string;
      plan?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('polar-signature') || '';

    // SECURITY: Webhook signature verification is MANDATORY
    // If secret is not configured, reject all webhooks to prevent forgery attacks
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      console.error('SECURITY: POLAR_WEBHOOK_SECRET not configured - rejecting webhook');
      return NextResponse.json(
        { error: 'Webhook verification not configured' },
        { status: 500 }
      );
    }

    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('Invalid webhook signature - possible forgery attempt');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event: PolarWebhookEvent = JSON.parse(body);
    console.log('Polar webhook event:', event.type);

    const { type, data } = event;

    // Extract user ID from metadata
    const userId = data.metadata?.userId;
    if (!userId) {
      console.error('No userId in webhook metadata');
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'subscription.created':
      case 'subscription.activated':
      case 'checkout.completed': {
        // User subscribed or completed checkout
        const plan = (data.metadata?.plan || 'starter') as PlanType;
        const currentPeriodEnd = new Date(data.current_period_end);

        await activateSubscription(
          userId,
          data.customer_id,
          data.id,
          plan,
          currentPeriodEnd
        );
        console.log(`Subscription activated for user ${userId}: ${plan}`);
        break;
      }

      case 'subscription.updated': {
        // Subscription was updated (renewed, plan changed, etc.)
        if (data.status === 'active') {
          const currentPeriodEnd = new Date(data.current_period_end);
          await renewSubscription(userId, currentPeriodEnd);
          console.log(`Subscription renewed for user ${userId}`);
        }
        break;
      }

      case 'subscription.canceled': {
        // User requested cancellation (but still active until period end)
        await cancelSubscription(userId, data.cancel_at_period_end);
        console.log(`Subscription canceled for user ${userId}`);
        break;
      }

      case 'subscription.revoked':
      case 'subscription.ended': {
        // Subscription has actually ended
        await endSubscription(userId);
        console.log(`Subscription ended for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
