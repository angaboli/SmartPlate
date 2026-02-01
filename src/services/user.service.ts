import { db } from '@/lib/db';
import type { Role } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/lib/errors';

export async function listUsers() {
  return db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function changeUserRole(
  targetUserId: string,
  newRole: Role,
  actingUserId: string,
) {
  if (targetUserId === actingUserId) {
    throw new ValidationError('Cannot change your own role');
  }

  const validRoles: Role[] = ['user', 'editor', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw new ValidationError(`Invalid role: ${newRole}`);
  }

  const user = await db.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return db.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}
