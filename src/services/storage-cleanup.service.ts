import { db } from '@/lib/db';
import { listObjects, deleteObject, extractKeyFromPublicUrl } from '@/lib/storage';

// Grace period before an unreferenced R2 object is considered orphaned,
// not merely mid-flow (e.g. a recipe draft the user hasn't submitted yet,
// or an import preview they're still reviewing).
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

export interface CleanupResult {
  scanned: number;
  deleted: number;
}

/**
 * Deletes R2 objects under recipes/* and avatars/* that no longer match
 * any Recipe.imageUrl / User.avatarUrl in the database — covers both
 * never-attached uploads (recipes/pending/*, recipes/imports/*) and
 * images left behind after being replaced (recipes/{id}/*, avatars/{userId}/*).
 */
export async function cleanupOrphanedUploads(): Promise<CleanupResult> {
  const [recipes, users] = await Promise.all([
    db.recipe.findMany({ select: { imageUrl: true } }),
    db.user.findMany({ select: { avatarUrl: true } }),
  ]);

  const referencedKeys = new Set<string>();
  for (const { imageUrl } of recipes as { imageUrl: string | null }[]) {
    const key = imageUrl && extractKeyFromPublicUrl(imageUrl);
    if (key) referencedKeys.add(key);
  }
  for (const { avatarUrl } of users as { avatarUrl: string | null }[]) {
    const key = avatarUrl && extractKeyFromPublicUrl(avatarUrl);
    if (key) referencedKeys.add(key);
  }

  const [recipeObjects, avatarObjects] = await Promise.all([
    listObjects('recipes/'),
    listObjects('avatars/'),
  ]);
  const allObjects = [...recipeObjects, ...avatarObjects];

  const cutoff = Date.now() - ORPHAN_AGE_MS;
  const orphans = allObjects.filter(
    (obj) => !referencedKeys.has(obj.key) && obj.lastModified.getTime() < cutoff,
  );

  await Promise.all(orphans.map((obj) => deleteObject(obj.key)));

  return { scanned: allObjects.length, deleted: orphans.length };
}
