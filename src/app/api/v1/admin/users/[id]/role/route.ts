import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { changeUserRole } from '@/services/user.service';
import { handleApiError, AuthError } from '@/lib/errors';
import { changeUserRoleSchema } from '@/lib/validations/admin';

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
    const { role } = changeUserRoleSchema.parse(body);

    const updated = await changeUserRole(id, role, user.sub);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
