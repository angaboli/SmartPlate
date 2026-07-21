import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  },
}));

import { db } from '../../lib/__mocks__/db';
import { stripe } from '@/lib/stripe';
import {
  hasActiveAccess,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  syncSubscriptionFromStripeEvent,
  requireActiveSubscription,
  checkImportQuota,
  checkFavoritesQuota,
} from '../subscription.service';
import { SubscriptionRequiredError, NotFoundError } from '@/lib/errors';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hasActiveAccess', () => {
  it('grants access for active and trialing', () => {
    expect(hasActiveAccess('active')).toBe(true);
    expect(hasActiveAccess('trialing')).toBe(true);
  });

  it('denies access for none, past_due, and canceled', () => {
    expect(hasActiveAccess('none')).toBe(false);
    expect(hasActiveAccess('past_due')).toBe(false);
    expect(hasActiveAccess('canceled')).toBe(false);
  });
});

describe('getOrCreateStripeCustomer', () => {
  it('reuses an existing stripeCustomerId', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@test.com',
      name: 'A',
      stripeCustomerId: 'cus_existing',
    });

    const id = await getOrCreateStripeCustomer('u1');

    expect(id).toBe('cus_existing');
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });

  it('creates and persists a new Stripe customer when none exists', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@test.com',
      name: 'A',
      stripeCustomerId: null,
    });
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new' } as never);
    db.user.update.mockResolvedValue({});

    const id = await getOrCreateStripeCustomer('u1');

    expect(id).toBe('cus_new');
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { stripeCustomerId: 'cus_new' },
    });
  });

  it('throws NotFoundError for an unknown user', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(getOrCreateStripeCustomer('u1')).rejects.toThrow(NotFoundError);
  });
});

describe('createCheckoutSession', () => {
  it('creates a subscription checkout session with a 7-day trial', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@test.com',
      name: 'A',
      stripeCustomerId: 'cus_1',
    });
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/session123',
    } as never);

    const session = await createCheckoutSession('u1');

    expect(session.url).toContain('checkout.stripe.com');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_1',
        subscription_data: { trial_period_days: 7 },
      }),
    );
  });
});

describe('createPortalSession', () => {
  it('creates a billing portal session for a subscribed user', async () => {
    db.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_1' });
    vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
      url: 'https://billing.stripe.com/session123',
    } as never);

    const session = await createPortalSession('u1');

    expect(session.url).toContain('billing.stripe.com');
  });

  it('throws NotFoundError when the user has no Stripe customer yet', async () => {
    db.user.findUnique.mockResolvedValue({ stripeCustomerId: null });
    await expect(createPortalSession('u1')).rejects.toThrow(NotFoundError);
  });
});

describe('syncSubscriptionFromStripeEvent', () => {
  it('persists the subscription id on checkout.session.completed', async () => {
    db.user.updateMany.mockResolvedValue({ count: 1 });

    await syncSubscriptionFromStripeEvent({
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_1', subscription: 'sub_1' } },
    } as never);

    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: { stripeSubscriptionId: 'sub_1' },
    });
  });

  it('syncs status and period end on customer.subscription.updated', async () => {
    db.user.updateMany.mockResolvedValue({ count: 1 });

    await syncSubscriptionFromStripeEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'trialing',
          items: { data: [{ current_period_end: 1735689600 }] },
        },
      },
    } as never);

    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: {
        stripeSubscriptionId: 'sub_1',
        subscriptionStatus: 'trialing',
        subscriptionCurrentPeriodEnd: new Date(1735689600 * 1000),
      },
    });
  });

  it('marks the user canceled on customer.subscription.deleted', async () => {
    db.user.updateMany.mockResolvedValue({ count: 1 });

    await syncSubscriptionFromStripeEvent({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1' } },
    } as never);

    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: { subscriptionStatus: 'canceled' },
    });
  });

  it('ignores unhandled event types', async () => {
    await syncSubscriptionFromStripeEvent({ type: 'invoice.paid', data: { object: {} } } as never);
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });
});

describe('requireActiveSubscription', () => {
  it('resolves for an active subscriber', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
    await expect(requireActiveSubscription('u1')).resolves.toBeUndefined();
  });

  it('throws SubscriptionRequiredError for a free user', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'none' });
    await expect(requireActiveSubscription('u1')).rejects.toThrow(SubscriptionRequiredError);
  });

  it('never blocks an admin, even with no subscription', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'admin', subscriptionStatus: 'none' });
    await expect(requireActiveSubscription('u1')).resolves.toBeUndefined();
  });
});

describe('checkImportQuota', () => {
  it('does not throw for subscribed users regardless of count', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'active' });
    await expect(checkImportQuota('u1')).resolves.toBeUndefined();
    expect(db['import'].count).not.toHaveBeenCalled();
  });

  it('allows free users under the 5-import lifetime cap', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'none' });
    db['import'].count.mockResolvedValue(4);
    await expect(checkImportQuota('u1')).resolves.toBeUndefined();
  });

  it('blocks free users at the 5-import lifetime cap', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'none' });
    db['import'].count.mockResolvedValue(5);
    await expect(checkImportQuota('u1')).rejects.toThrow(SubscriptionRequiredError);
  });

  it('never blocks an admin, even past the cap', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'admin', subscriptionStatus: 'none' });
    await expect(checkImportQuota('u1')).resolves.toBeUndefined();
    expect(db['import'].count).not.toHaveBeenCalled();
  });
});

describe('checkFavoritesQuota', () => {
  it('does not throw for subscribed users regardless of count', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'trialing' });
    await expect(checkFavoritesQuota('u1')).resolves.toBeUndefined();
    expect(db.savedRecipe.count).not.toHaveBeenCalled();
  });

  it('allows free users under the 3-favorite cap', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'none' });
    db.savedRecipe.count.mockResolvedValue(2);
    await expect(checkFavoritesQuota('u1')).resolves.toBeUndefined();
  });

  it('blocks free users at the 3-favorite cap', async () => {
    db.user.findUnique.mockResolvedValue({ subscriptionStatus: 'none' });
    db.savedRecipe.count.mockResolvedValue(3);
    await expect(checkFavoritesQuota('u1')).rejects.toThrow(SubscriptionRequiredError);
  });

  it('never blocks an admin, even past the cap', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'admin', subscriptionStatus: 'none' });
    await expect(checkFavoritesQuota('u1')).resolves.toBeUndefined();
    expect(db.savedRecipe.count).not.toHaveBeenCalled();
  });
});
