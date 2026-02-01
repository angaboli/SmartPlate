import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { listUsers } from '@/services/user.service';
import { handleApiError, AuthError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return handleApiError(new AuthError('Unauthorized'));
    }

    requireRole(user, 'admin');

    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}
