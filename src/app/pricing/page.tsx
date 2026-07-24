'use client';

import Link from 'next/link';
import { Check, X, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  useSubscription,
  useCreateCheckoutSession,
  useCreatePortalSession,
} from '@/hooks/useSubscription';

export default function PricingPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { hasActiveAccess, isLoading } = useSubscription();
  const checkout = useCreateCheckoutSession();
  const portal = useCreatePortalSession();

  const freeFeatures = [
    { label: t('pricing.freeItemBrowse'), included: true },
    { label: t('pricing.freeItemImports'), included: true },
    { label: t('pricing.freeItemFavorites'), included: true },
    { label: t('pricing.freeItemDashboard'), included: false },
  ];

  const proFeatures = [
    t('pricing.proItemBrowse'),
    t('pricing.proItemImports'),
    t('pricing.proItemFavorites'),
    t('pricing.proItemDashboard'),
  ];

  const faqs = [
    { q: t('pricing.faq1Q'), a: t('pricing.faq1A') },
    { q: t('pricing.faq2Q'), a: t('pricing.faq2A') },
    { q: t('pricing.faq3Q'), a: t('pricing.faq3A') },
    { q: t('pricing.faq4Q'), a: t('pricing.faq4A') },
  ];

  const proCta = !isAuthenticated ? (
    <Button size="lg" className="w-full" asChild>
      <Link href="/register">{t('subscription.upgradeCta')}</Link>
    </Button>
  ) : hasActiveAccess ? (
    <Button
      size="lg"
      variant="outline"
      className="w-full"
      onClick={() => portal.mutate()}
      disabled={portal.isPending}
    >
      {portal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('subscription.manageBilling')}
    </Button>
  ) : (
    <Button
      size="lg"
      className="w-full"
      onClick={() => checkout.mutate()}
      disabled={checkout.isPending || isLoading}
    >
      {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('subscription.upgradeCta')}
    </Button>
  );

  return (
    <div className="min-h-screen space-y-16 pb-16 max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t('pricing.title')}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t('pricing.subtitle')}</p>
      </section>

      {/* Plans */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Free plan */}
        <Card>
          <CardContent className="flex h-full flex-col gap-6 p-8">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{t('pricing.freeTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('pricing.freeDesc')}</p>
            </div>
            <p className="text-3xl font-bold">{t('pricing.freePrice')}</p>
            <ul className="flex-1 space-y-3 text-sm">
              {freeFeatures.map((f) => (
                <li key={f.label} className="flex items-center gap-2">
                  {f.included ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={f.included ? '' : 'text-muted-foreground'}>{f.label}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" variant="outline" className="w-full" asChild>
              <Link href={isAuthenticated ? '/recipes' : '/register'}>{t('pricing.freeCta')}</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pro plan */}
        <Card className="relative overflow-hidden border-primary/50">
          <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            {t('pricing.popularBadge')}
          </div>
          <CardContent className="flex h-full flex-col gap-6 p-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{t('pricing.proTitle')}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t('pricing.proDesc')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{t('pricing.proPrice')}</p>
              <p className="text-sm text-muted-foreground">{t('pricing.proTrial')}</p>
            </div>
            <ul className="flex-1 space-y-3 text-sm">
              {proFeatures.map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            {proCta}
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-bold">{t('pricing.faqTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <CardContent className="space-y-2 p-6">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
