import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { changeUserRole } from '@/services/user.service';
import { handleApiError, AuthError, ValidationError } from '@/lib/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return handleApiError(new AuthError('Unauthorized'));
    }

    requireRole(user, 'admin');

    const { id } = await params;
    const body = await request.json();

    if (!body.role || !['user', 'editor', 'admin'].includes(body.role)) {
      throw new ValidationError(
        'role must be "user", "editor", or "admin"',
      );
    }

    const updated = await changeUserRole(id, body.role, user.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
