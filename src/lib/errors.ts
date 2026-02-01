import { NextResponse } from 'next/server';

// ─── Base error ────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ─── Specific errors ───────────────────────────────

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    public details?: unknown,
  ) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

// ─── Shared error handler ──────────────────────────

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    const body: Record<string, unknown> = { error: error.message };
    if (error instanceof ValidationError && error.details) {
      body.details = error.details;
    }
    return NextResponse.json(body, { status: error.statusCode });
  }

  // Zod validation errors
  if (error instanceof Error && error.name === 'ZodError') {
    return NextResponse.json(
      { error: 'Validation failed', details: (error as any).issues },
      { status: 400 },
    );
  }

  // Prisma unique constraint
  if (
    error instanceof Error &&
    error.message.includes('Unique constraint')
  ) {
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 },
    );
  }

  // Prisma record not found
  if (
    error instanceof Error &&
    (error.message.includes('Record to update not found') ||
      error.message.includes('Record to delete does not exist'))
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Generic
  console.error('[API Error]', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 },
  );
}
