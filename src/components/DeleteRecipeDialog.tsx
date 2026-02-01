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

  function handleDelete() {
    deleteRecipe.mutate(recipeId, {
      onSuccess: () => {
        toast.success('Recipe deleted');
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
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{recipeTitle}&quot;? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteRecipe.isPending}
          >
            {deleteRecipe.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
