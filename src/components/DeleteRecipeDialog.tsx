'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useDeleteRecipe } from '@/hooks/useRecipes';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeleteRecipeDialogProps {
  recipeId: string;
  recipeTitle: string;
  redirectTo?: string;
}

export function DeleteRecipeDialog({
  recipeId,
  recipeTitle,
  redirectTo = '/recipes',
}: DeleteRecipeDialogProps) {
  const deleteRecipe = useDeleteRecipe();
  const router = useRouter();
  const { t } = useLanguage();

  function handleDelete() {
    deleteRecipe.mutate(recipeId, {
      onSuccess: () => {
        toast.success(t('deleteRecipe.deleted'));
        router.push(redirectTo);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteRecipe.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteRecipe.confirm').replace('{title}', recipeTitle)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteRecipe.isPending}
          >
            {deleteRecipe.isPending ? t('deleteRecipe.deleting') : t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
