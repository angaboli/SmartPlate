import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Brain, TrendingUp, Calendar, Utensils, Sparkles, CheckCircle, Download } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { useState } from 'react';
import { ImportRecipeDialog } from '@/app/components/ImportRecipeDialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useLanguage();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Get instant feedback on your meals with advanced nutrition AI',
    },
    {
      icon: Calendar,
      title: 'Weekly Meal Planning',
      description: 'Auto-generate balanced meal plans tailored to your goals',
    },
    {
      icon: Utensils,
      title: 'SafariTaste Recipes',
      description: 'Discover global flavors with health-conscious recipes',
    },
    {
      icon: TrendingUp,
      title: 'Smart Suggestions',
      description: 'Receive personalized recommendations to improve nutrition',
    },
  ];

  const benefits = [
    'Track meals effortlessly',
    'AI-driven insights',
    'Personalized meal plans',
    'Global recipe discovery',
    'Nutrition goal tracking',
    'Smart food swaps',
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI-Powered Nutrition
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  Smarter meals, powered by AI
                </h1>
                <p className="text-lg text-muted-foreground md:text-xl">
                  Track, analyze and improve your nutrition effortlessly with SmartPlate AI
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => onNavigate('dashboard')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Brain className="mr-2 h-5 w-5" />
                  Analyze my meals
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t('import.button')}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                {benefits.slice(0, 4).map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"
                  alt="Healthy meal"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <Badge className="mb-2 bg-primary text-primary-foreground">
                    AI Analysis Ready
                  </Badge>
                  <p className="text-sm text-foreground/90">
                    Instant nutrition insights for every meal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need for better nutrition
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comprehensive tools powered by artificial intelligence
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SafariTaste Section */}
      <section className="container px-4 md:px-6">
        <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-[#E8F4F1] to-[#F6F1EA] dark:from-[#2A312E] dark:to-[#1F2423]">
          <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12 lg:gap-12">
            <div className="space-y-6">
              <Badge variant="outline" className="border-[#8A6A4F] text-[#8A6A4F]">
                SafariTaste Universe
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Discover global flavors
              </h2>
              <p className="text-muted-foreground">
                Explore curated recipes from around the world, optimized for nutrition and taste. 
                SafariTaste brings you the best of international cuisine, powered by AI recommendations.
              </p>
              <Button
                onClick={() => onNavigate('recipes')}
                className="bg-primary text-primary-foreground"
              >
                <Utensils className="mr-2 h-5 w-5" />
                Explore Recipes
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop"
                alt="Recipe 1"
                className="aspect-square rounded-xl object-cover"
              />
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop"
                alt="Recipe 2"
                className="aspect-square rounded-xl object-cover"
              />
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop"
                alt="Recipe 3"
                className="aspect-square rounded-xl object-cover"
              />
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"
                alt="Recipe 4"
                className="aspect-square rounded-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 md:px-6">
        <div className="rounded-2xl border bg-primary p-8 text-center text-primary-foreground md:p-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Start your nutrition journey today
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/90">
            Join thousands of users who are improving their health with AI-powered nutrition insights
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => onNavigate('dashboard')}
            className="mt-8"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      <ImportRecipeDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}