'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{t('privacy.title')}</h1>
        <p className="text-muted-foreground">{t('privacy.lastUpdated')}</p>
      </section>

      {/* Introduction */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('privacy.introTitle')}</h2>
          <p className="text-muted-foreground">{t('privacy.introDesc')}</p>
        </CardContent>
      </Card>

      {/* Data Collection */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('privacy.collectTitle')}</h2>
          <p className="text-muted-foreground">{t('privacy.collectDesc')}</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('privacy.collectItem1')}</li>
            <li>{t('privacy.collectItem2')}</li>
            <li>{t('privacy.collectItem3')}</li>
            <li>{t('privacy.collectItem4')}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Data Usage */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('privacy.usageTitle')}</h2>
          <p className="text-muted-foreground">{t('privacy.usageDesc')}</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('privacy.usageItem1')}</li>
            <li>{t('privacy.usageItem2')}</li>
            <li>{t('privacy.usageItem3')}</li>
            <li>{t('privacy.usageItem4')}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Third Party */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('privacy.thirdPartyTitle')}</h2>
          <p className="text-muted-foreground">{t('privacy.thirdPartyDesc')}</p>
        </CardContent>
      </Card>

      {/* Cookies */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('privacy.cookiesTitle')}</h2>
          <p className="text-muted-foreground">{t('privacy.cookiesDesc')}</p>
        </CardContent>
      </Card>

      {/* GDPR Rights */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('privacy.gdprTitle')}</h2>
          <p className="text-muted-foreground">{t('privacy.gdprDesc')}</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('privacy.gdprItem1')}</li>
            <li>{t('privacy.gdprItem2')}</li>
            <li>{t('privacy.gdprItem3')}</li>
            <li>{t('privacy.gdprItem4')}</li>
            <li>{t('privacy.gdprItem5')}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('privacy.contactTitle')}</h2>
          <p className="text-muted-foreground">{t('privacy.contactDesc')}</p>
          <p className="font-medium">
            <a href="mailto:contact@smartplate.fr" className="text-primary hover:underline">
              contact@smartplate.fr
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
