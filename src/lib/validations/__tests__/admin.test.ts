import { describe, it, expect } from 'vitest';
import { changeUserRoleSchema } from '../admin';

describe('changeUserRoleSchema', () => {
  it('accepts user role', () => {
    const result = changeUserRoleSchema.parse({ role: 'user' });
    expect(result.role).toBe('user');
  });

  it('accepts editor role', () => {
    const result = changeUserRoleSchema.parse({ role: 'editor' });
    expect(result.role).toBe('editor');
  });

  it('accepts admin role', () => {
    const result = changeUserRoleSchema.parse({ role: 'admin' });
    expect(result.role).toBe('admin');
  });

  it('rejects invalid role', () => {
    expect(() => changeUserRoleSchema.parse({ role: 'superadmin' })).toThrow();
  });

  it('rejects missing role', () => {
    expect(() => changeUserRoleSchema.parse({})).toThrow();
  });
});
