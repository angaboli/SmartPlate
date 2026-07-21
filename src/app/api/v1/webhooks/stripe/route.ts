import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { syncSubscriptionFromStripeEvent } from '@/services/subscription.service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // Stripe signs the exact raw bytes of the body — request.json() would
  // re-serialize and break signature verification.
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    await syncSubscriptionFromStripeEvent(event);
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'Failed to process Stripe webhook event');
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
