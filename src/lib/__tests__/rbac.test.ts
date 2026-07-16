import { describe, it, expect } from 'vitest';
import {
  requireRole,
  canEditRecipe,
  canManagePublicationStatus,
  canManageUsers,
} from '../rbac';
import type { JwtPayload } from '../auth';

function makeUser(role: JwtPayload['role'], sub = 'u1'): JwtPayload {
  return { sub, email: `${sub}@test.com`, role };
}

describe('requireRole', () => {
  it('does not throw when the user has an allowed role', () => {
    expect(() => requireRole(makeUser('admin'), 'admin')).not.toThrow();
    expect(() => requireRole(makeUser('editor'), 'editor', 'admin')).not.toThrow();
  });

  it('throws ForbiddenError when the user role is not allowed', () => {
    expect(() => requireRole(makeUser('user'), 'admin')).toThrow('Insufficient permissions');
    expect(() => requireRole(makeUser('editor'), 'admin')).toThrow('Insufficient permissions');
  });
});

describe('canEditRecipe', () => {
  it('allows the author to edit their own recipe', () => {
    expect(canEditRecipe(makeUser('user', 'author1'), { authorId: 'author1' })).toBe(true);
  });

  it('allows an admin to edit any recipe', () => {
    expect(canEditRecipe(makeUser('admin', 'admin1'), { authorId: 'someone-else' })).toBe(true);
  });

  it('denies a non-author, non-admin user', () => {
    expect(canEditRecipe(makeUser('user', 'u1'), { authorId: 'someone-else' })).toBe(false);
  });

  it('denies when the recipe has no author', () => {
    expect(canEditRecipe(makeUser('user', 'u1'), { authorId: null })).toBe(false);
  });

  it('denies an editor who is not the author', () => {
    expect(canEditRecipe(makeUser('editor', 'e1'), { authorId: 'someone-else' })).toBe(false);
  });
});

describe('canManagePublicationStatus', () => {
  it('allows editor and admin', () => {
    expect(canManagePublicationStatus(makeUser('editor'))).toBe(true);
    expect(canManagePublicationStatus(makeUser('admin'))).toBe(true);
  });

  it('denies a regular user', () => {
    expect(canManagePublicationStatus(makeUser('user'))).toBe(false);
  });
});

describe('canManageUsers', () => {
  it('allows only admin', () => {
    expect(canManageUsers(makeUser('admin'))).toBe(true);
    expect(canManageUsers(makeUser('editor'))).toBe(false);
    expect(canManageUsers(makeUser('user'))).toBe(false);
  });
});
