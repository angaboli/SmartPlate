import { ForbiddenError } from '@/lib/errors';
import type { JwtPayload } from '@/lib/auth';

type Role = 'user' | 'editor' | 'admin';

/** Throws ForbiddenError if the user's role is not in the allowed list. */
export function requireRole(
  payload: JwtPayload,
  ...allowedRoles: Role[]
): void {
  if (!allowedRoles.includes(payload.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

/** Returns true if the user is the recipe author or an admin. */
export function canEditRecipe(
  user: JwtPayload,
  recipe: { authorId: string | null },
): boolean {
  if (user.role === 'admin') return true;
  return recipe.authorId !== null && recipe.authorId === user.sub;
}

/** Returns true if the user can manage publication status (editor or admin). */
export function canManagePublicationStatus(user: JwtPayload): boolean {
  return user.role === 'editor' || user.role === 'admin';
}

/** Returns true if the user can manage other users (admin only). */
export function canManageUsers(user: JwtPayload): boolean {
  return user.role === 'admin';
}
