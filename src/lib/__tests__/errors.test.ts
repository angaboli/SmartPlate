import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  handleApiError,
} from '../errors';

// Mock logger to prevent pino output in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Error classes', () => {
  it('AppError has correct statusCode', () => {
    const err = new AppError('test', 418);
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(418);
  });

  it('AuthError has status 401', () => {
    const err = new AuthError('bad token');
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError has status 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });

  it('NotFoundError has status 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
  });

  it('ConflictError has status 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });

  it('ValidationError has status 400 with optional details', () => {
    const err = new ValidationError('bad input', { field: 'email' });
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('handleApiError', () => {
  it('handles AppError', async () => {
    const response = handleApiError(new AppError('test error', 422));
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.error).toBe('test error');
  });

  it('handles ValidationError with details', async () => {
    const response = handleApiError(new ValidationError('bad', { field: 'x' }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.details).toEqual({ field: 'x' });
  });

  it('handles ZodError-like error', async () => {
    const zodError = new Error('Validation failed');
    zodError.name = 'ZodError';
    (zodError as any).issues = [{ path: ['email'], message: 'Required' }];

    const response = handleApiError(zodError);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.details).toHaveLength(1);
  });

  it('handles Prisma unique constraint error', async () => {
    const response = handleApiError(new Error('Unique constraint violation'));
    const body = await response.json();
    expect(response.status).toBe(409);
  });

  it('handles Prisma record not found error', async () => {
    const response = handleApiError(new Error('Record to update not found'));
    const body = await response.json();
    expect(response.status).toBe(404);
  });

  it('handles unknown error as 500', async () => {
    const response = handleApiError(new Error('something unexpected'));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});
