'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCreateRecipe } from '@/hooks/useRecipes';
import { RecipeForm } from '@/components/RecipeForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreateRecipePage() {
  const { user } = useAuth();
  const router = useRouter();
  const createRecipe = useCreateRecipe();
  const { t } = useLanguage();

  const role = user?.role;

  useEffect(() => {
    if (user && role !== 'editor' && role !== 'admin') {
      router.replace('/');
    }
  }, [user, role, router]);

  if (!user || (role !== 'editor' && role !== 'admin')) return null;

  return (
    <div className="min-h-screen mx-auto max-w-2xl space-y-6 pb-20">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/recipes/manage">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('manage.backToManagement')}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{t('manage.createTitle')}</h1>
        <p className="text-muted-foreground">
          {t('manage.createDesc')}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <RecipeForm
          onSubmit={(data) => {
            createRecipe.mutate(data, {
              onSuccess: (recipe) => {
                toast.success(t('manage.recipeCreated'));
                router.push(`/recipes/${recipe.id}`);
              },
              onError: (err) => {
                toast.error(err.message);
              },
            });
          }}
          isPending={createRecipe.isPending}
          submitLabel={t('manage.createRecipe')}
        />
      </div>
    </div>
  );
}
