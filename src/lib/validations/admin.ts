import { z } from 'zod';

export const changeUserRoleSchema = z.object({
  role: z.enum(['user', 'editor', 'admin']),
});

export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;
