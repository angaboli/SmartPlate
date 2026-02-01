import { hash, compare } from 'bcryptjs';
import { db } from '@/lib/db';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from '@/lib/auth';
import { AuthError, ConflictError } from '@/lib/errors';
import type { RegisterInput, LoginInput } from '@/lib/validations/auth';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 7;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tokens: AuthTokens;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existing = await db.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      settings: {
        create: {},
      },
    },
  });

  const tokens = await generateTokens(user);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tokens,
  };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await db.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new AuthError('Invalid email or password');
  }

  const valid = await compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid email or password');
  }

  const tokens = await generateTokens(user);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tokens,
  };
}

export async function refresh(refreshTokenValue: string): Promise<AuthTokens> {
  let payload: JwtPayload;
  try {
    payload = await verifyRefreshToken(refreshTokenValue);
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }

  const storedToken = await db.refreshToken.findUnique({
    where: { token: refreshTokenValue },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    if (storedToken) {
      await db.refreshToken.delete({ where: { id: storedToken.id } });
    }
    throw new AuthError('Invalid or expired refresh token');
  }

  // Rotate: delete old, issue new
  await db.refreshToken.delete({ where: { id: storedToken.id } });

  const user = storedToken.user;
  return generateTokens(user);
}

export async function logout(refreshTokenValue: string): Promise<void> {
  await db.refreshToken.deleteMany({
    where: { token: refreshTokenValue },
  });
}

// ─── Helpers ────────────────────────────────────────

async function generateTokens(user: {
  id: string;
  email: string;
  name: string | null;
  role?: 'user' | 'editor' | 'admin';
}): Promise<AuthTokens> {
  const jwtPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role ?? 'user',
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(jwtPayload),
    signRefreshToken(jwtPayload),
  ]);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

// Re-export for backward compatibility with route handlers that import from here
export { AuthError } from '@/lib/errors';
