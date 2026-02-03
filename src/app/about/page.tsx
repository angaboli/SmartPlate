'use client';

import { Brain, Utensils, Calendar, Heart, Target, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Brain,
      title: t('about.feature1Title'),
      description: t('about.feature1Desc'),
    },
    {
      icon: Utensils,
      title: t('about.feature2Title'),
      description: t('about.feature2Desc'),
    },
    {
      icon: Calendar,
      title: t('about.feature3Title'),
      description: t('about.feature3Desc'),
    },
  ];

  const values = [
    {
      icon: Heart,
      title: t('about.value1Title'),
      description: t('about.value1Desc'),
    },
    {
      icon: Target,
      title: t('about.value2Title'),
      description: t('about.value2Desc'),
    },
    {
      icon: Shield,
      title: t('about.value3Title'),
      description: t('about.value3Desc'),
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          {t('about.heroTitle')}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {t('about.heroDesc')}
        </p>
      </section>

      {/* Mission Section */}
      <section>
        <Card>
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">{t('about.missionTitle')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('about.missionDesc')}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-center">{t('about.featuresTitle')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6 space-y-4">
                  <div className="inline-flex rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Values Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-center">{t('about.valuesTitle')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6 space-y-4">
                  <div className="inline-flex rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
