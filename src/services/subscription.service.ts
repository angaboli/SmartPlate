import type { SubscriptionStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { NotFoundError, SubscriptionRequiredError } from '@/lib/errors';

const FREE_IMPORT_LIMIT = 5;
const FREE_FAVORITES_LIMIT = 3;

export function hasActiveAccess(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) throw new NotFoundError('User not found');

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(userId: string) {
  const customerId = await getOrCreateStripeCustomer(userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
  });

  return session;
}

export async function createPortalSession(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    throw new NotFoundError('No billing account found for this user');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/dashboard`,
  });
}

// ─── Webhook sync ────────────────────────────────────

export async function syncSubscriptionFromStripeEvent(
  event: import('stripe').Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as import('stripe').Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string | null;
      if (!customerId || !subscriptionId) return;

      await db.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { stripeSubscriptionId: subscriptionId },
      });
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: mapStripeStatus(subscription.status),
          subscriptionCurrentPeriodEnd: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000)
            : null,
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: 'canceled' },
      });
      break;
    }

    default:
      break;
  }
}

function mapStripeStatus(
  status: import('stripe').Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'none';
  }
}

export async function requireActiveSubscription(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  if (!user) throw new NotFoundError('User not found');

  if (!hasActiveAccess(user.subscriptionStatus)) {
    throw new SubscriptionRequiredError(
      'This feature requires an active subscription.',
    );
  }
}

// ─── Lifetime quotas (free tier) ─────────────────────

export async function checkImportQuota(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  if (!user) throw new NotFoundError('User not found');
  if (hasActiveAccess(user.subscriptionStatus)) return;

  const count = await db['import'].count({ where: { userId } });
  if (count >= FREE_IMPORT_LIMIT) {
    throw new SubscriptionRequiredError(
      `Free plan is limited to ${FREE_IMPORT_LIMIT} imports. Upgrade to import unlimited recipes.`,
    );
  }
}

export async function checkFavoritesQuota(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  if (!user) throw new NotFoundError('User not found');
  if (hasActiveAccess(user.subscriptionStatus)) return;

  const count = await db.savedRecipe.count({ where: { userId } });
  if (count >= FREE_FAVORITES_LIMIT) {
    throw new SubscriptionRequiredError(
      `Free plan is limited to ${FREE_FAVORITES_LIMIT} saved recipes. Upgrade to save unlimited favorites.`,
    );
  }
}
