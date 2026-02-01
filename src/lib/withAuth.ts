import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, type JwtPayload } from '@/lib/auth';
import { handleApiError, ForbiddenError, AuthError } from '@/lib/errors';

type RouteContext = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: RouteContext,
  user: JwtPayload,
) => Promise<NextResponse>;

type Role = 'user' | 'editor' | 'admin';

/**
 * Higher-order function that wraps a route handler with auth + optional role check.
 *
 * Usage:
 *   export const POST = withAuth('editor', 'admin')(async (req, ctx, user) => { ... });
 *   export const GET  = withAuth()(async (req, ctx, user) => { ... }); // any authenticated user
 */
export function withAuth(...roles: Role[]) {
  return (handler: AuthenticatedHandler) =>
    async (req: NextRequest, ctx: RouteContext) => {
      try {
        const user = await getCurrentUser(req);
        if (!user) {
          return handleApiError(new AuthError('Unauthorized'));
        }
        if (roles.length && !roles.includes(user.role)) {
          return handleApiError(new ForbiddenError('Insufficient permissions'));
        }
        return await handler(req, ctx, user);
      } catch (error) {
        return handleApiError(error);
      }
    };
}
