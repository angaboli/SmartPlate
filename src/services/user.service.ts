import { db } from '@/lib/db';
import type { Role } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/lib/errors';

// ─── Profile ────────────────────────────────────────

export interface ProfileDTO {
  id: string;
  email: string;
  name: string | null;
  role: string;
  settings: {
    language: string;
    goal: string;
    age: number | null;
    weightKg: number | null;
    heightCm: number | null;
    activityLevel: string | null;
    calorieTarget: number;
    proteinTargetG: number;
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
    allergies: string[];
  };
}

export async function getProfile(userId: string): Promise<ProfileDTO> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
  if (!user) throw new NotFoundError('User not found');

  const s = user.settings;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    settings: {
      language: s?.language ?? 'en',
      goal: s?.goal ?? 'maintain',
      age: s?.age ?? null,
      weightKg: s?.weightKg ?? null,
      heightCm: s?.heightCm ?? null,
      activityLevel: s?.activityLevel ?? null,
      calorieTarget: s?.calorieTarget ?? 2000,
      proteinTargetG: s?.proteinTargetG ?? 60,
      vegetarian: s?.vegetarian ?? false,
      vegan: s?.vegan ?? false,
      glutenFree: s?.glutenFree ?? false,
      dairyFree: s?.dairyFree ?? false,
      allergies: s?.allergies ?? [],
    },
  };
}

export interface UpdateProfileInput {
  name?: string;
  settings?: {
    language?: string;
    goal?: string;
    age?: number | null;
    weightKg?: number | null;
    heightCm?: number | null;
    activityLevel?: string | null;
    calorieTarget?: number;
    proteinTargetG?: number;
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    allergies?: string[];
  };
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput,
): Promise<ProfileDTO> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  if (data.name !== undefined) {
    await db.user.update({
      where: { id: userId },
      data: { name: data.name },
    });
  }

  if (data.settings) {
    await db.userSettings.upsert({
      where: { userId },
      create: { userId, ...data.settings },
      update: data.settings,
    });
  }

  return getProfile(userId);
}

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
