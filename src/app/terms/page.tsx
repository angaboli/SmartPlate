'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{t('terms.title')}</h1>
        <p className="text-muted-foreground">{t('terms.lastUpdated')}</p>
      </section>

      {/* Acceptance */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.acceptanceTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.acceptanceDesc')}</p>
        </CardContent>
      </Card>

      {/* Service Description */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.serviceTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.serviceDesc')}</p>
        </CardContent>
      </Card>

      {/* User Accounts */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.accountsTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.accountsDesc')}</p>
        </CardContent>
      </Card>

      {/* Subscriptions & Billing */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.subscriptionTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.subscriptionDesc')}</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('terms.subscriptionItem1')}</li>
            <li>{t('terms.subscriptionItem2')}</li>
            <li>{t('terms.subscriptionItem3')}</li>
            <li>{t('terms.subscriptionItem4')}</li>
          </ul>
        </CardContent>
      </Card>

      {/* User Content */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.contentTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.contentDesc')}</p>
        </CardContent>
      </Card>

      {/* Medical Disclaimer */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.disclaimerTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.disclaimerDesc')}</p>
        </CardContent>
      </Card>

      {/* Limitation of Liability */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.liabilityTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.liabilityDesc')}</p>
        </CardContent>
      </Card>

      {/* Termination */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.terminationTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.terminationDesc')}</p>
        </CardContent>
      </Card>

      {/* Governing Law */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.governingLawTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.governingLawDesc')}</p>
        </CardContent>
      </Card>

      {/* Changes to Terms */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('terms.changesTitle')}</h2>
          <p className="text-muted-foreground">{t('terms.changesDesc')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
