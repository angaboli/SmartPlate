'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipe, useUpdateRecipe, useChangeRecipeStatus } from '@/hooks/useRecipes';
import { RecipeForm } from '@/components/RecipeForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const updateRecipe = useUpdateRecipe();
  const changeStatus = useChangeRecipeStatus();
  const { t } = useLanguage();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen mx-auto max-w-2xl space-y-6 pb-20">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">{t('recipes.notFound')}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/recipes/manage">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('manage.backToManagement')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen mx-auto max-w-2xl space-y-6 pb-20">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/recipes/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('manage.backToRecipe')}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{t('manage.editTitle')}</h1>
        <p className="text-muted-foreground">
          {t('manage.editDesc')}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <RecipeForm
          initialData={recipe}
          onSubmit={(data) => {
            updateRecipe.mutate(
              { id, data },
              {
                onSuccess: () => {
                  toast.success(t('manage.recipeUpdated'));
                  router.push(`/recipes/${id}`);
                },
                onError: (err) => {
                  toast.error(err.message);
                },
              },
            );
          }}
          isPending={updateRecipe.isPending}
          submitLabel={t('manage.saveChanges')}
          userRole={user?.role}
          onStatusChange={(status) => {
            changeStatus.mutate(
              { id, status: status as 'draft' | 'pending_review' | 'published' | 'rejected' },
              {
                onSuccess: () => {
                  toast.success(`${t('manage.statusChanged')} ${status}`);
                },
                onError: (err) => {
                  toast.error(err.message);
                },
              },
            );
          }}
        />
      </div>
    </div>
  );
}
