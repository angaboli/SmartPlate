// Shared between RecipeCard.tsx and CookLaterList.tsx, which both need to
// show a badge for a recipe's non-published status (draft, pending_review,
// rejected) — published recipes never show a badge.
export const recipeStatusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const recipeStatusLabelKeys: Record<string, string> = {
  draft: 'recipes.status.draft',
  pending_review: 'recipes.status.pendingReview',
  published: 'recipes.status.published',
  rejected: 'recipes.status.rejected',
};
