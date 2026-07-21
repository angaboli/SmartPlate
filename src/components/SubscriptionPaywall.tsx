'use client';

import { Crown, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useCreateCheckoutSession } from '@/hooks/useSubscription';

export function SubscriptionPaywall() {
  const { t } = useLanguage();
  const checkout = useCreateCheckoutSession();

  const perks = [
    t('subscription.perkTracking'),
    t('subscription.perkPlanning'),
    t('subscription.perkUnlimitedImports'),
    t('subscription.perkUnlimitedFavorites'),
  ];

  return (
    <div className="rounded-xl border border-dashed bg-secondary/30 p-12 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">{t('subscription.paywallTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('subscription.paywallDesc')}</p>

        <ul className="space-y-2 text-left text-sm">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2">
          <p className="mb-3 text-sm font-medium">{t('subscription.pricing')}</p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crown className="mr-2 h-4 w-4" />
            )}
            {t('subscription.upgradeCta')}
          </Button>
        </div>
      </div>
    </div>
  );
}
