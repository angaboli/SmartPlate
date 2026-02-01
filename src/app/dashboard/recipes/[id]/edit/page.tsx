'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipe, useUpdateRecipe } from '@/hooks/useRecipes';
import { RecipeForm } from '@/components/RecipeForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const updateRecipe = useUpdateRecipe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">Recipe not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/recipes/manage">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to management
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/recipes/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to recipe
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Edit Recipe</h1>
        <p className="text-muted-foreground">
          Update the recipe details below.
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
                  toast.success('Recipe updated');
                  router.push(`/recipes/${id}`);
                },
                onError: (err) => {
                  toast.error(err.message);
                },
              },
            );
          }}
          isPending={updateRecipe.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
